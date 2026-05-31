import { db } from '@/lib/db';
import { NextResponse } from 'next/server';
import { findUserByPhone, fetchProgressFromSheet } from '@/lib/sheet-sync';

export async function GET(request: Request) {
  try {
    // Get phone from query param (sent by frontend after auth)
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone');

    // Fetch user profile LIVE from Google Sheet
    let student = null;
    if (phone) {
      const sheetUser = await findUserByPhone(phone, true);
      if (sheetUser) {
        student = {
          name: sheetUser.name,
          phone: sheetUser.phone,
          grade: sheetUser.grade,
          board: sheetUser.board,
          field: sheetUser.field,
          status: sheetUser.status,
          startDate: sheetUser.startDate,
          targetDate: sheetUser.targetDate,
          currentDay: sheetUser.currentDay,
          totalDays: sheetUser.totalDays,
          topicsDone: sheetUser.topicsDone,
          daysLeft: sheetUser.daysLeft,
          pacingGoal: '5M', // default, can be overridden
        };
      }
    }

    // Fallback: if no phone param, try local DB
    if (!student) {
      const localStudent = await db.student.findFirst();
      if (localStudent) {
        student = {
          name: localStudent.name,
          phone: localStudent.phone,
          grade: localStudent.grade,
          board: localStudent.board,
          field: localStudent.field,
          status: localStudent.status,
          startDate: localStudent.startDate,
          targetDate: localStudent.targetDate,
          currentDay: localStudent.currentDay,
          totalDays: localStudent.totalDays,
          topicsDone: localStudent.topicsDone,
          daysLeft: localStudent.daysLeft,
          pacingGoal: localStudent.pacingGoal,
        };
      }
    }

    // Fetch subjects filtered by the student's grade
    // The DB stores grades as strings like "9", "10", or "Grade 10" — normalize
    const studentGrade = String(student?.grade || '10');
    const gradeVariants = [studentGrade, `Grade ${studentGrade}`];
    const subjects = await db.subject.findMany({
      where: { grade: { in: gradeVariants } },
      orderBy: { order: 'asc' },
      include: {
        chapters: {
          orderBy: { number: 'asc' },
          include: {
            topics: {
              orderBy: { number: 'asc' },
            },
          },
        },
      },
    });

    // Fetch progress - prefer live sheet data, fallback to local DB
    let progress: { topicId: string; completed: boolean; dateCompleted: Date | null }[] = [];
    
    if (phone) {
      // Try to get progress from the live Google Sheet
      const sheetProgress = await fetchProgressFromSheet(false);
      const userProgress = sheetProgress.filter(p => p.phone === phone && p.completed);
      
      if (userProgress.length > 0) {
        progress = userProgress.map(p => ({
          topicId: p.topicId,
          completed: p.completed,
          dateCompleted: p.dateCompleted ? new Date(p.dateCompleted) : null,
        }));
      }
    }

    // Fallback to local DB progress if no sheet progress
    if (progress.length === 0) {
      progress = await db.progress.findMany({
        where: { studentPhone: student?.phone || '' },
      });
    }

    // Fetch special courses filtered by student's grade
    const specialCourses = await db.specialCourse.findMany({
      where: { grade: { in: gradeVariants } },
      orderBy: { order: 'asc' },
    });

    // Compute per-subject progress
    const subjectProgress = subjects.map(subject => {
      const allTopics = subject.chapters.flatMap(ch => ch.topics);
      const completedTopics = allTopics.filter(topic =>
        progress.some(p => p.topicId === topic.id && p.completed)
      );

      // For free users, only count "isFree" topics as available
      const isFreeUser = student?.status === 'free';
      const availableTopics = isFreeUser ? allTopics.filter(t => t.isFree) : allTopics;

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        color: subject.color,
        icon: subject.icon,
        totalTopics: availableTopics.length,
        completedTopics: completedTopics.filter(t => 
          isFreeUser ? allTopics.find(at => at.id === t.id)?.isFree : true
        ).length,
        progressPct: availableTopics.length > 0 ? Math.round((completedTopics.filter(t => 
          isFreeUser ? allTopics.find(at => at.id === t.id)?.isFree : true
        ).length / availableTopics.length) * 100) : 0,
        chapterCount: subject.chapters.length,
        isLocked: isFreeUser && subject.name !== 'Physics', // Free users only see Physics
        chapters: subject.chapters.map(ch => ({
          id: ch.id,
          number: ch.number,
          name: ch.name,
          totalTopics: ch.topics.length,
          completedTopics: ch.topics.filter(t =>
            progress.some(p => p.topicId === t.id && p.completed)
          ).length,
        })),
      };
    });

    // === PARALLEL TASK ASSIGNMENT ALGORITHM ===
    const pacingGoal = student?.pacingGoal || '5M';
    const pacingMonths: Record<string, number> = { '3M': 3, '5M': 5, '6M': 6 };
    const months = pacingMonths[pacingGoal] || 5;
    const totalDaysInPlan = months * 30;

    const allTopics = subjects.flatMap(s => s.chapters.flatMap(ch => ch.topics));
    const totalTopicsCount = allTopics.length;
    const totalCompleted = progress.filter(p => p.completed).length;
    const totalRemaining = totalTopicsCount - totalCompleted;

    const currentDay = student?.currentDay || 1;
    const daysLeft = Math.max(1, totalDaysInPlan - currentDay);
    const topicsPerDay = totalRemaining > 0 ? Math.ceil(totalRemaining / daysLeft) : 0;

    // Build queues per subject
    const isFreeUser = student?.status === 'free';
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

    for (const subject of subjects) {
      // Free users only get tasks from unlocked subjects
      if (isFreeUser && subject.name !== 'Physics') continue;

      const allSubjectTopics = subject.chapters.flatMap(ch => ch.topics);
      const completedCount = allSubjectTopics.filter(t =>
        progress.some(p => p.topicId === t.id && p.completed)
      ).length;

      const remaining = allSubjectTopics
        .filter(t => !progress.some(p => p.topicId === t.id && p.completed))
        .filter(t => isFreeUser ? t.isFree : true) // Free users only see free topics
        .sort((a, b) => {
          const chA = subject.chapters.find(ch => ch.id === a.chapterId);
          const chB = subject.chapters.find(ch => ch.id === b.chapterId);
          if (chA && chB && chA.number !== chB.number) return chA.number - chB.number;
          return a.number - b.number;
        })
        .map(t => {
          const chapter = subject.chapters.find(ch => ch.id === t.chapterId);
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
            videoLink: isFreeUser ? '' : topic.videoLink, // Free users don't see videos
            pdfLink: topic.pdfLink,
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
    const todayDone = finalTodayTasks.filter(t =>
      progress.some(p => p.topicId === t.topicId && p.completed)
    ).length;
    const focusScore = finalTodayTasks.length > 0 ? Math.round((todayDone / finalTodayTasks.length) * 100) : 0;

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
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

function completedCountForMonth(progress: { completed: boolean; dateCompleted: Date | null }[], month: number): number {
  return progress.filter(p => {
    if (!p.completed || !p.dateCompleted) return false;
    const d = new Date(p.dateCompleted);
    return d.getMonth() === month - 1;
  }).length;
}

function calculateStreak(progress: { completed: boolean; dateCompleted: Date | null }[]): number {
  const completedDates = progress
    .filter(p => p.completed && p.dateCompleted)
    .map(p => new Date(p.dateCompleted!).toDateString())
    .filter((v, i, a) => a.indexOf(v) === i)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

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
