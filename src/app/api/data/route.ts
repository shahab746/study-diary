import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

// Force dynamic rendering — always return fresh data from the DB
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone');
    const isTurso = !!process.env.LIBSQL_URL;

    // ─── STEP 1: Fetch student profile ────────────────────────────────
    let student = null;
    let academicGroup = '';
    const studentSelect = {
      name: true, phone: true, grade: true, board: true, field: true,
      status: true, startDate: true, targetDate: true, currentDay: true,
      totalDays: true, topicsDone: true, daysLeft: true, pacingGoal: true,
      academicGroup: true,
    } as const;

    if (phone) {
      const localStudent = await db.student.findUnique({
        where: { phone },
        select: studentSelect,
      });
      if (localStudent) {
        academicGroup = localStudent.academicGroup || '';
        student = localStudent;
      }
    }
    if (!student) {
      const localStudent = await db.student.findFirst({ select: studentSelect });
      if (localStudent) {
        academicGroup = localStudent.academicGroup || '';
        student = localStudent;
      }
    }

    const studentGrade = String(student?.grade || '10');
    const gradeVariants = [studentGrade, `Grade ${studentGrade}`];

    // ─── STEP 2: Fetch ALL data in batch queries ──────────────────────
    // CRITICAL: Use batch queries instead of N+1 includes to avoid 
    // hundreds of sequential HTTP round-trips to Turso
    
    let subjects: any[];
    let chapters: any[];
    let topics: any[];
    let progress: any[];
    let specialCourses: any[];

    if (isTurso) {
      // Direct SQL — 5 queries total instead of 500+
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createClient } = require('@libsql/client') as typeof import('@libsql/client');
      const client = createClient({
        url: process.env.LIBSQL_URL!,
        authToken: process.env.LIBSQL_AUTH_TOKEN || undefined,
      });

      const gradePlaceholders = gradeVariants.map(() => '?').join(', ');
      
      const [subjectsResult, chaptersResult, topicsResult, progressResult, specialCoursesResult] = await Promise.all([
        client.execute({
          sql: `SELECT * FROM Subject WHERE "grade" IN (${gradePlaceholders}) ORDER BY "order" ASC`,
          args: gradeVariants,
        }),
        client.execute(`SELECT * FROM Chapter ORDER BY number ASC`),
        client.execute(`SELECT * FROM Topic ORDER BY number ASC`),
        client.execute({
          sql: 'SELECT * FROM Progress WHERE "studentPhone" = ?',
          args: [student?.phone || ''],
        }),
        client.execute({
          sql: `SELECT * FROM SpecialCourse WHERE "grade" IN (${gradePlaceholders}) ORDER BY "order" ASC`,
          args: gradeVariants,
        }),
      ]);

      client.close();

      // Convert to camelCase objects
      const toCamel = (row: any) => {
        const result: any = {};
        for (const [key, value] of Object.entries(row as Record<string, any>)) {
          const camelKey = key.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
          result[camelKey] = value;
        }
        return result;
      };

      subjects = subjectsResult.rows.map(toCamel);
      chapters = chaptersResult.rows.map(toCamel);
      topics = topicsResult.rows.map(toCamel);
      progress = progressResult.rows.map(toCamel);
      specialCourses = specialCoursesResult.rows.map(toCamel);
    } else {
      // Local: use Prisma with includes (efficient locally)
      const [subjectsResult, allProgress, specialCoursesResult] = await Promise.all([
        db.subject.findMany({
          where: { grade: { in: gradeVariants } },
          orderBy: { order: 'asc' },
          include: {
            chapters: {
              orderBy: { number: 'asc' },
              include: {
                topics: { orderBy: { number: 'asc' } },
              },
            },
          },
        }),
        db.progress.findMany({ where: { studentPhone: student?.phone || '' } }),
        db.specialCourse.findMany({
          where: { grade: { in: gradeVariants } },
          orderBy: { order: 'asc' },
        }),
      ]);

      subjects = subjectsResult;
      progress = allProgress;
      specialCourses = specialCoursesResult;
      chapters = []; // Not needed for Prisma (already nested)
      topics = [];   // Not needed for Prisma (already nested)
    }

    // ─── STEP 3: Assemble relationships in memory (Turso only) ────────
    if (isTurso) {
      // Build lookup maps for O(1) access
      const chaptersBySubject = new Map<string, any[]>();
      for (const ch of chapters) {
        const list = chaptersBySubject.get(ch.subjectId) || [];
        list.push(ch);
        chaptersBySubject.set(ch.subjectId, list);
      }

      const topicsByChapter = new Map<string, any[]>();
      for (const t of topics) {
        const list = topicsByChapter.get(t.chapterId) || [];
        list.push(t);
        topicsByChapter.set(t.chapterId, list);
      }

      // Assemble subjects with nested chapters & topics
      for (const subject of subjects) {
        const subjectChapters = chaptersBySubject.get(subject.id) || [];
        for (const ch of subjectChapters) {
          ch.topics = topicsByChapter.get(ch.id) || [];
        }
        subject.chapters = subjectChapters;
      }
    }

    // ─── STEP 4: Filter subjects by Group_Eligibility ─────────────────
    const eligibleSubjects = subjects.filter((subject: any) => {
      const eligibility = subject.groupEligibility || 'Both';
      if (eligibility === 'Both') return true;
      if (academicGroup && eligibility === academicGroup) return true;
      if (!academicGroup) return true;
      return false;
    });

    // ─── STEP 5: Compute per-subject progress ─────────────────────────
    const progressSet = new Set(
      progress.filter((p: any) => p.completed).map((p: any) => p.topicId)
    );

    const isFreeUser = student?.status === 'free';
    const subjectProgress = eligibleSubjects.map((subject: any) => {
      const allTopics = subject.chapters.flatMap((ch: any) => ch.topics || []);
      const completedTopics = allTopics.filter((t: any) => progressSet.has(t.id));
      const availableTopics = isFreeUser ? allTopics.filter((t: any) => t.isFree) : allTopics;

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        color: subject.color,
        icon: subject.icon,
        totalTopics: availableTopics.length,
        completedTopics: completedTopics.filter((t: any) =>
          isFreeUser ? allTopics.find((at: any) => at.id === t.id)?.isFree : true
        ).length,
        progressPct: availableTopics.length > 0
          ? Math.round((completedTopics.filter((t: any) =>
              isFreeUser ? allTopics.find((at: any) => at.id === t.id)?.isFree : true
            ).length / availableTopics.length) * 100)
          : 0,
        chapterCount: subject.chapters.length,
        isLocked: isFreeUser && subject.name !== 'Physics',
        chapters: subject.chapters.map((ch: any) => ({
          id: ch.id,
          number: ch.number,
          name: ch.name,
          totalTopics: (ch.topics || []).length,
          completedTopics: (ch.topics || []).filter((t: any) => progressSet.has(t.id)).length,
        })),
      };
    });

    // ─── STEP 6: Build today's tasks ──────────────────────────────────
    const pacingGoal = student?.pacingGoal || '5M';
    const pacingMonths: Record<string, number> = { '3M': 3, '5M': 5, '6M': 6 };
    const months = pacingMonths[pacingGoal] || 5;
    const totalDaysInPlan = months * 30;

    const allTopicsFlat = eligibleSubjects.flatMap((s: any) => s.chapters.flatMap((ch: any) => ch.topics || []));
    const totalTopicsCount = allTopicsFlat.length;
    const totalCompleted = progress.filter((p: any) => p.completed).length;
    const totalRemaining = totalTopicsCount - totalCompleted;

    const currentDay = student?.currentDay || 1;
    const daysLeft = Math.max(1, totalDaysInPlan - currentDay);
    const topicsPerDay = totalRemaining > 0 ? Math.ceil(totalRemaining / daysLeft) : 0;

    // Build queues per subject
    const subjectQueues: Array<{
      subjectName: string;
      subjectColor: string;
      subjectIcon: string;
      remaining: Array<{
        topicId: string;
        topicName: string;
        dayNumber: number;
        chapterName: string;
        videoLink: string;
        pdfLink: string;
        chapterId: string;
        isFree: boolean;
      }>;
      totalTopics: number;
      completedCount: number;
      expectedByNow: number;
    }> = [];

    for (const subject of eligibleSubjects) {
      if (isFreeUser && subject.name !== 'Physics') continue;

      const allSubjectTopics = subject.chapters.flatMap((ch: any) => ch.topics || []);
      const completedCount = allSubjectTopics.filter((t: any) => progressSet.has(t.id)).length;

      const remaining = allSubjectTopics
        .filter((t: any) => !progressSet.has(t.id))
        .filter((t: any) => isFreeUser ? t.isFree : true)
        .sort((a: any, b: any) => {
          const chA = subject.chapters.find((ch: any) => ch.id === a.chapterId);
          const chB = subject.chapters.find((ch: any) => ch.id === b.chapterId);
          if (chA && chB && chA.number !== chB.number) return chA.number - chB.number;
          return a.number - b.number;
        })
        .map((t: any) => {
          const chapter = subject.chapters.find((ch: any) => ch.id === t.chapterId);
          return {
            topicId: t.id,
            topicName: t.name,
            dayNumber: t.dayNumber,
            chapterName: chapter?.name || '',
            videoLink: t.videoLink,
            pdfLink: t.pdfLink,
            chapterId: t.chapterId,
            isFree: t.isFree,
          };
        });

      const expectedByNow = Math.round((allSubjectTopics.length / totalDaysInPlan) * currentDay);

      subjectQueues.push({
        subjectName: subject.name,
        subjectColor: subject.color,
        subjectIcon: subject.icon,
        remaining,
        totalTopics: allSubjectTopics.length,
        completedCount,
        expectedByNow,
      });
    }

    // Calculate proportional allocation
    const totalRemainingTopics = subjectQueues.reduce((sum, q) => sum + q.remaining.length, 0);
    const subjectTaskAllocation = subjectQueues.map(q => {
      const share = totalRemainingTopics > 0 ? q.remaining.length / totalRemainingTopics : 0;
      const allocated = q.remaining.length > 0 ? Math.max(1, Math.round(topicsPerDay * share)) : 0;
      return { ...q, allocated };
    });

    // Round-robin interleaving
    const todayTasks: Array<{
      topicId: string;
      topicName: string;
      dayNumber: number;
      subjectName: string;
      subjectColor: string;
      chapterName: string;
      completed: boolean;
      videoLink: string;
      pdfLink: string;
      priority: 'high' | 'medium' | 'low';
      subjectIcon: string;
      duration: number;
    }> = [];

    const pickIndices: Record<string, number> = {};
    for (const sq of subjectTaskAllocation) {
      pickIndices[sq.subjectName] = 0;
    }

    let hasMore = true;
    while (hasMore) {
      hasMore = false;
      for (const sq of subjectTaskAllocation) {
        const idx = pickIndices[sq.subjectName];
        if (idx < Math.min(sq.allocated, sq.remaining.length)) {
          const topic = sq.remaining[idx];
          const isBehind = sq.completedCount < sq.expectedByNow - 2;
          const isOnTrack = sq.completedCount < sq.expectedByNow;

          let priority: 'high' | 'medium' | 'low';
          if (isBehind) priority = 'high';
          else if (isOnTrack) priority = 'medium';
          else priority = 'low';

          todayTasks.push({
            topicId: topic.topicId,
            topicName: topic.topicName,
            dayNumber: topic.dayNumber,
            subjectName: sq.subjectName,
            subjectColor: sq.subjectColor,
            chapterName: topic.chapterName,
            completed: false,
            videoLink: toValidUrl(isFreeUser ? '' : topic.videoLink),
            pdfLink: toValidUrl(topic.pdfLink),
            priority,
            subjectIcon: sq.subjectIcon,
            duration: 65,
          });
          pickIndices[sq.subjectName] = idx + 1;
          hasMore = true;
        }
      }
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    todayTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    const finalTodayTasks = todayTasks.slice(0, 10);

    // Performance data
    const performanceData = [
      { month: 'May', lectures: completedCountForMonth(progress, 5) },
      { month: 'Jun', lectures: completedCountForMonth(progress, 6) },
      { month: 'Jul', lectures: completedCountForMonth(progress, 7) },
    ];

    // Focus score
    const focusScore = finalTodayTasks.length > 0
      ? Math.round((finalTodayTasks.filter(t =>
          progressSet.has(t.topicId)
        ).length / finalTodayTasks.length) * 100)
      : 0;

    // Streak
    const streak = calculateStreak(progress);

    // Program week
    const programWeek = Math.ceil(currentDay / 7);
    const totalWeeks = Math.ceil(totalDaysInPlan / 7);
    const weeksLeft = totalWeeks - programWeek;

    // Pacing goals
    const pacingGoals = {
      '3M': { months: 3, targetDate: getTargetDate(3), topicsPerDay: Math.ceil(totalRemaining / 90) },
      '5M': { months: 5, targetDate: getTargetDate(5), topicsPerDay: Math.ceil(totalRemaining / 150) },
      '6M': { months: 6, targetDate: getTargetDate(6), topicsPerDay: Math.ceil(totalRemaining / 180) },
    };

    return NextResponse.json({
      student,
      subjects: subjectProgress,
      specialCourses,
      todayTasks: finalTodayTasks,
      performanceData,
      pacingGoals,
      totalTopics: totalTopicsCount,
      totalCompleted,
      topicsPerDay,
      focusScore,
      streak,
      programWeek,
      weeksLeft,
      isFreeUser,
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    const errStack = error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined;
    return NextResponse.json({
      error: 'Failed to fetch data',
      detail: errMsg,
      stack: errStack,
    }, { status: 500 });
  }
}

function toValidUrl(value: string): string {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  return '';
}

function completedCountForMonth(progress: any[], month: number): number {
  return progress.filter((p: any) => {
    if (!p.completed || !p.dateCompleted) return false;
    const d = new Date(p.dateCompleted);
    return d.getMonth() === month - 1;
  }).length;
}

function calculateStreak(progress: any[]): number {
  const completedDates = progress
    .filter((p: any) => p.completed && p.dateCompleted)
    .map((p: any) => new Date(p.dateCompleted).toDateString())
    .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
    .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime());

  if (completedDates.length === 0) return 0;

  let streak = 1;
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  if (completedDates[0] !== today && completedDates[0] !== yesterday) return 0;

  for (let i = 1; i < completedDates.length; i++) {
    const prevDate = new Date(completedDates[i - 1]);
    const currDate = new Date(completedDates[i]);
    const diffDays = Math.round((prevDate.getTime() - currDate.getTime()) / 86400000);
    if (diffDays === 1) streak++;
    else break;
  }
  return streak;
}

function getTargetDate(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
}
