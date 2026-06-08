import { NextResponse } from 'next/server';
import {
  findUserByPhone,
  fetchProgressFromSheet,
  fetchSpecialCoursesFromSheet,
  buildCurriculumHierarchy,
} from '@/lib/sheet-sync';
import { findRegisteredUserByPhone } from '@/lib/registered-users';

// ─── Color & Icon Mapping ───────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  'Blue': '#3B82F6', 'Teal': '#14B8A6', 'Purple': '#8B5CF6', 'Green': '#22C55E',
  'Amber': '#F59E0B', 'Rose': '#F43F5E', 'Sky': '#0EA5E9', 'Orange': '#F97316',
  'Emerald': '#10B981', 'Gray': '#6B7280', 'Red': '#EF4444',
};

const SUBJECT_ICON_MAP: Record<string, string> = {
  'Physics': 'atom', 'Chemistry': 'beaker', 'Computer Science': 'cpu',
  'Biology': 'beaker', 'Mathematics': 'pi', 'Maths': 'pi',
  'English': 'book', 'Urdu': 'book', 'Pak Studies': 'landmark', 'Islamiat': 'landmark',
};

function mapColor(color: string): string {
  if (color?.startsWith('#')) return color;
  return COLOR_MAP[color] || '#6B7280';
}

function mapIcon(icon: string, subjectName?: string): string {
  if (subjectName && SUBJECT_ICON_MAP[subjectName]) return SUBJECT_ICON_MAP[subjectName];
  return 'book';
}

// Normalize student status from Google Sheet values
function normalizeStatus(status: string): string {
  if (!status) return 'free';
  const s = status.toLowerCase().trim();
  if (s === 'true' || s === 'paid') return 'paid';
  if (s === 'false' || s === 'free') return 'free';
  if (s === 'blocked' || s === 'disabled') return s;
  return s;
}

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone');

    // ─── STEP 1: Fetch student profile from Google Sheets ─────────────
    let student: Record<string, any> | null = null;
    let academicGroup = '';

    if (phone) {
      const sheetUser = await findUserByPhone(phone, true);
      if (sheetUser) {
        academicGroup = sheetUser.academicGroup || '';
        student = {
          name: sheetUser.name,
          phone: sheetUser.phone,
          grade: sheetUser.grade,
          board: sheetUser.board,
          field: sheetUser.field,
          status: normalizeStatus(sheetUser.status),
          startDate: sheetUser.startDate,
          targetDate: sheetUser.targetDate,
          currentDay: sheetUser.currentDay,
          totalDays: sheetUser.totalDays,
          topicsDone: sheetUser.topicsDone,
          daysLeft: sheetUser.daysLeft,
          pacingGoal: sheetUser.pacingGoal || '5M',
          academicGroup: sheetUser.academicGroup,
          pin: sheetUser.pin,
        };
      }
    }

    // If no student found in Sheets, check registered-users cache (for newly registered users)
    if (!student && phone) {
      const cachedUser = await findRegisteredUserByPhone(phone, false);
      if (cachedUser) {
        academicGroup = cachedUser.academicGroup || '';
        student = {
          name: cachedUser.name,
          phone: cachedUser.phone,
          grade: cachedUser.grade,
          board: cachedUser.board,
          field: cachedUser.field,
          status: normalizeStatus(cachedUser.status),
          startDate: cachedUser.startDate,
          targetDate: cachedUser.targetDate,
          currentDay: cachedUser.currentDay,
          totalDays: cachedUser.totalDays,
          topicsDone: cachedUser.topicsDone,
          daysLeft: cachedUser.daysLeft,
          pacingGoal: cachedUser.pacingGoal || '5M',
          academicGroup: cachedUser.academicGroup,
          pin: cachedUser.pin,
        };
      }
    }

    // Last resort: if still no student, try first user from Sheets (fallback)
    if (!student) {
      const { fetchUsersFromSheet } = await import('@/lib/sheet-sync');
      const allUsers = await fetchUsersFromSheet(false);
      const firstUser = allUsers[0];
      if (firstUser) {
        academicGroup = firstUser.academicGroup || '';
        student = {
          name: firstUser.name,
          phone: firstUser.phone,
          grade: firstUser.grade,
          board: firstUser.board,
          field: firstUser.field,
          status: normalizeStatus(firstUser.status),
          startDate: firstUser.startDate,
          targetDate: firstUser.targetDate,
          currentDay: firstUser.currentDay,
          totalDays: firstUser.totalDays,
          topicsDone: firstUser.topicsDone,
          daysLeft: firstUser.daysLeft,
          pacingGoal: firstUser.pacingGoal || '5M',
          academicGroup: firstUser.academicGroup,
          pin: firstUser.pin,
        };
      }
    }

    const studentGrade = String(student?.grade || '10');

    // ─── STEP 2: Fetch curriculum, progress, special courses in parallel ──
    const [subjects, progressRows, specialCourses] = await Promise.all([
      buildCurriculumHierarchy(),
      phone ? fetchProgressFromSheet() : Promise.resolve([]),
      fetchSpecialCoursesFromSheet(),
    ]);

    // ─── STEP 3: Filter subjects by grade ──────────────────────────────
    const gradeVariants = [studentGrade, `Grade ${studentGrade}`];
    const gradeSet = new Set(gradeVariants);

    const filteredSubjects = subjects.filter(s => gradeSet.has(s.grade));

    // ─── STEP 4: Filter by Group_Eligibility ───────────────────────────
    const eligibleSubjects = filteredSubjects.filter(subject => {
      const eligibility = subject.groupEligibility || 'Both';
      if (eligibility === 'Both') return true;
      if (academicGroup && eligibility === academicGroup) return true;
      if (!academicGroup) return true;
      return false;
    });

    // ─── STEP 5: Build progress lookup ─────────────────────────────────
    const progressSet = new Set(
      progressRows.filter(p => p.phone === (student?.phone || '') && p.completed).map(p => p.topicId)
    );

    const isFreeUser = normalizeStatus(student?.status || '') === 'free';

    // ─── STEP 6: Compute per-subject progress ──────────────────────────
    const subjectProgress = eligibleSubjects.map(subject => {
      const allTopics = subject.chapters.flatMap(ch => ch.topics);
      const completedTopics = allTopics.filter(t => progressSet.has(t.id));
      const availableTopics = isFreeUser ? allTopics.filter(t => t.isFree) : allTopics;

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        color: mapColor(subject.color),
        icon: mapIcon(subject.icon, subject.name),
        totalTopics: availableTopics.length,
        completedTopics: completedTopics.filter(t =>
          isFreeUser ? allTopics.find(at => at.id === t.id)?.isFree : true
        ).length,
        progressPct: availableTopics.length > 0
          ? Math.round((completedTopics.filter(t =>
              isFreeUser ? allTopics.find(at => at.id === t.id)?.isFree : true
            ).length / availableTopics.length) * 100)
          : 0,
        chapterCount: subject.chapters.length,
        isLocked: isFreeUser && subject.name !== 'Physics',
        chapters: subject.chapters.map(ch => ({
          id: ch.id,
          number: ch.number,
          name: ch.name,
          totalTopics: ch.topics.length,
          completedTopics: ch.topics.filter(t => progressSet.has(t.id)).length,
        })),
      };
    });

    // ─── STEP 7: Build today's tasks ───────────────────────────────────
    const pacingGoal = (student as any)?.pacingGoal || '5M';
    const pacingMonths: Record<string, number> = { '3M': 3, '5M': 5, '6M': 6 };
    const months = pacingMonths[pacingGoal] || 5;
    const totalDaysInPlan = months * 30;

    const allTopicsFlat = eligibleSubjects.flatMap(s => s.chapters.flatMap(ch => ch.topics));
    const totalTopicsCount = allTopicsFlat.length;
    const totalCompleted = progressRows.filter(p => p.phone === (student?.phone || '') && p.completed).length;
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
        isFree: boolean;
      }>;
      totalTopics: number;
      completedCount: number;
      expectedByNow: number;
    }> = [];

    for (const subject of eligibleSubjects) {
      if (isFreeUser && subject.name !== 'Physics') continue;

      const allSubjectTopics = subject.chapters.flatMap(ch => ch.topics);
      const completedCount = allSubjectTopics.filter(t => progressSet.has(t.id)).length;

      const remaining = allSubjectTopics
        .filter(t => !progressSet.has(t.id))
        .filter(t => isFreeUser ? t.isFree : true)
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
            isFree: t.isFree,
          };
        });

      const expectedByNow = Math.round((allSubjectTopics.length / totalDaysInPlan) * currentDay);

      subjectQueues.push({
        subjectName: subject.name,
        subjectColor: mapColor(subject.color),
        subjectIcon: mapIcon(subject.icon, subject.name),
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
      { month: 'May', lectures: completedCountForMonth(progressRows, student?.phone || '', 5) },
      { month: 'Jun', lectures: completedCountForMonth(progressRows, student?.phone || '', 6) },
      { month: 'Jul', lectures: completedCountForMonth(progressRows, student?.phone || '', 7) },
    ];

    // Focus score
    const focusScore = finalTodayTasks.length > 0
      ? Math.round((finalTodayTasks.filter(t => progressSet.has(t.topicId)).length / finalTodayTasks.length) * 100)
      : 0;

    // Streak
    const streak = calculateStreak(progressRows, student?.phone || '');

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

    // Map special courses to expected format
    const specialCoursesFormatted = specialCourses.map(sc => ({
      id: `sc_${sc.name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${sc.order}`,
      name: sc.name,
      subject: sc.subject,
      topic: sc.topic,
      videoLink: sc.videoLink,
      pdfLink: sc.pdfLink,
    }));

    return NextResponse.json({
      student,
      subjects: subjectProgress,
      specialCourses: specialCoursesFormatted,
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

function completedCountForMonth(progress: Array<{ phone: string; completed: boolean; dateCompleted: string }>, phone: string, month: number): number {
  return progress.filter(p => {
    if (p.phone !== phone || !p.completed || !p.dateCompleted) return false;
    const d = new Date(p.dateCompleted);
    return d.getMonth() === month - 1;
  }).length;
}

function calculateStreak(progress: Array<{ phone: string; completed: boolean; dateCompleted: string }>, phone: string): number {
  const completedDates = progress
    .filter(p => p.phone === phone && p.completed && p.dateCompleted)
    .map(p => new Date(p.dateCompleted).toDateString())
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
