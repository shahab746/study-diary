import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Fetch student profile
    const student = await db.student.findFirst();
    
    // Fetch subjects with chapters and topic counts
    const subjects = await db.subject.findMany({
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

    // Fetch all progress records
    const progress = await db.progress.findMany({
      where: { studentPhone: student?.phone || '' },
    });

    // Fetch special courses
    const specialCourses = await db.specialCourse.findMany({
      orderBy: { order: 'asc' },
    });

    // Fetch config
    const configs = await db.config.findMany();
    const configMap: Record<string, string> = {};
    for (const c of configs) {
      configMap[c.key] = c.value;
    }

    // Compute per-subject progress
    const subjectProgress = subjects.map(subject => {
      const allTopics = subject.chapters.flatMap(ch => ch.topics);
      const completedTopics = allTopics.filter(topic =>
        progress.some(p => p.topicId === topic.id && p.completed)
      );
      return {
        subjectId: subject.id,
        subjectName: subject.name,
        color: subject.color,
        icon: subject.icon,
        totalTopics: allTopics.length,
        completedTopics: completedTopics.length,
        progressPct: allTopics.length > 0 ? Math.round((completedTopics.length / allTopics.length) * 100) : 0,
        chapterCount: subject.chapters.length,
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
    // This algorithm distributes today's tasks across ALL subjects in parallel,
    // so the student makes progress on every subject each day regardless of pacing goal.
    
    const pacingGoal = student?.pacingGoal || '5M';
    const pacingMonths: Record<string, number> = { '3M': 3, '5M': 5, '6M': 6 };
    const months = pacingMonths[pacingGoal] || 5;
    const totalDaysInPlan = months * 30;
    
    const allTopics = subjects.flatMap(s => s.chapters.flatMap(ch => ch.topics));
    const totalTopicsCount = allTopics.length;
    const totalCompleted = progress.filter(p => p.completed).length;
    const totalRemaining = totalTopicsCount - totalCompleted;
    
    // Calculate topics per day based on pacing goal (not stale student record)
    const currentDay = student?.currentDay || 1;
    const daysLeft = Math.max(1, totalDaysInPlan - currentDay);
    const topicsPerDay = totalRemaining > 0 ? Math.ceil(totalRemaining / daysLeft) : 0;

    // Build a queue of next uncompleted topics for each subject
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
      }>;
      totalTopics: number;
      completedCount: number;
      expectedByNow: number;
    }> = [];

    for (const subject of subjects) {
      const allSubjectTopics = subject.chapters.flatMap(ch => ch.topics);
      const completedCount = allSubjectTopics.filter(t =>
        progress.some(p => p.topicId === t.id && p.completed)
      ).length;
      
      // Get remaining topics, sorted by chapter then topic order
      const remaining = allSubjectTopics
        .filter(t => !progress.some(p => p.topicId === t.id && p.completed))
        .sort((a, b) => {
          const chA = subject.chapters.find(ch => ch.id === a.chapterId);
          const chB = subject.chapters.find(ch => ch.id === b.chapterId);
          if (chA && chB) {
            if (chA.number !== chB.number) return chA.number - chB.number;
          }
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
          };
        });

      // Calculate expected progress for priority
      const expectedByNow = Math.round((allSubjectTopics.length / totalDaysInPlan) * (student?.currentDay || 1));

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

    // Calculate how many topics to assign from each subject today
    // Proportional distribution: each subject gets tasks proportional to its remaining topics
    const totalRemainingTopics = subjectQueues.reduce((sum, q) => sum + q.remaining.length, 0);
    
    const subjectTaskAllocation = subjectQueues.map(q => {
      const share = totalRemainingTopics > 0 ? q.remaining.length / totalRemainingTopics : 0;
      // At least 1 topic from each subject that has remaining topics (parallel requirement)
      const allocated = q.remaining.length > 0 ? Math.max(1, Math.round(topicsPerDay * share)) : 0;
      return { ...q, allocated };
    });

    // Now interleave tasks from all subjects in round-robin fashion
    // This ensures the student sees tasks from DIFFERENT subjects mixed together
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

    // Pick tasks round-robin from each subject
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
            videoLink: topic.videoLink,
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

    // Sort tasks: high priority first, then medium, then low
    // But keep the round-robin interleaving within each priority level
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    todayTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Limit to max 10 tasks per day
    const finalTodayTasks = todayTasks.slice(0, 10);

    // Performance data - monthly breakdown
    const performanceData = [
      { month: 'May', lectures: completedCountForMonth(progress, 5) },
      { month: 'Jun', lectures: completedCountForMonth(progress, 6) },
      { month: 'Jul', lectures: completedCountForMonth(progress, 7) },
    ];

    // Calculate focus score (percentage of today's tasks done)
    const todayDone = finalTodayTasks.filter(t => 
      progress.some(p => p.topicId === t.topicId && p.completed)
    ).length;
    const focusScore = finalTodayTasks.length > 0 ? Math.round((todayDone / finalTodayTasks.length) * 100) : 0;

    // Calculate streak (consecutive days with at least 1 completion)
    const streak = calculateStreak(progress);

    // Calculate program week
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
      student: student ? {
        name: student.name,
        phone: student.phone,
        grade: student.grade,
        board: student.board,
        field: student.field,
        startDate: student.startDate,
        targetDate: student.targetDate,
        currentDay: student.currentDay,
        totalDays: student.totalDays,
        topicsDone: totalCompleted,
        daysLeft: student.daysLeft,
        pacingGoal: student.pacingGoal,
      } : null,
      subjects: subjectProgress,
      specialCourses,
      todayTasks: finalTodayTasks,
      performanceData,
      pacingGoals,
      config: configMap,
      totalTopics: totalTopicsCount,
      totalCompleted,
      topicsPerDay,
      focusScore,
      streak,
      programWeek,
      weeksLeft,
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
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

function getTargetDate(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
}
