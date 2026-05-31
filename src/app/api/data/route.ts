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
    const pacingGoal = student?.pacingGoal || '5M';
    const pacingMonths: Record<string, number> = { '3M': 3, '5M': 5, '6M': 6 };
    const months = pacingMonths[pacingGoal] || 5;
    const totalDaysInPlan = months * 30;
    
    const allTopics = subjects.flatMap(s => s.chapters.flatMap(ch => ch.topics));
    const totalTopicsCount = allTopics.length;
    const totalCompleted = progress.filter(p => p.completed).length;
    const totalRemaining = totalTopicsCount - totalCompleted;
    
    // Calculate topics per day based on pacing
    const daysLeft = student?.daysLeft || totalDaysInPlan;
    const topicsPerDay = totalRemaining > 0 ? Math.ceil(totalRemaining / daysLeft) : 0;

    // For each subject, determine next uncompleted topics proportionally
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

    for (const subject of subjects) {
      const allSubjectTopics = subject.chapters.flatMap(ch => ch.topics);
      const completedCount = allSubjectTopics.filter(t =>
        progress.some(p => p.topicId === t.id && p.completed)
      ).length;
      const remaining = allSubjectTopics
        .filter(t => !progress.some(p => p.topicId === t.id && p.completed))
        .sort((a, b) => {
          // Sort by chapter order, then topic order
          const chA = subject.chapters.find(ch => ch.id === a.chapterId);
          const chB = subject.chapters.find(ch => ch.id === b.chapterId);
          if (chA && chB) {
            if (chA.number !== chB.number) return chA.number - chB.number;
          }
          return a.number - b.number;
        });

      if (remaining.length === 0) continue;

      // How many topics from this subject should appear today?
      const subjectShare = totalRemaining > 0 ? remaining.length / totalRemaining : 0;
      const subjectTopicsToday = Math.max(1, Math.round(topicsPerDay * subjectShare));

      // Calculate expected progress for priority
      const expectedCompletedByNow = Math.round((allSubjectTopics.length / totalDaysInPlan) * (student?.currentDay || 1));
      const isBehind = completedCount < expectedCompletedByNow - 2;
      const isOnTrack = completedCount < expectedCompletedByNow;

      // Pick next uncompleted topics
      const nextTopics = remaining.slice(0, Math.min(subjectTopicsToday, 3));

      for (const topic of nextTopics) {
        const chapter = subject.chapters.find(ch => ch.id === topic.chapterId);
        
        // Priority based on progress vs expectation
        let priority: 'high' | 'medium' | 'low';
        if (isBehind) {
          priority = 'high';
        } else if (isOnTrack) {
          priority = 'medium';
        } else {
          priority = 'low';
        }

        todayTasks.push({
          topicId: topic.id,
          topicName: topic.name,
          dayNumber: topic.dayNumber,
          subjectName: subject.name,
          subjectColor: subject.color,
          chapterName: chapter?.name || '',
          completed: false,
          videoLink: topic.videoLink,
          pdfLink: topic.pdfLink,
          priority,
          subjectIcon: subject.icon,
          duration: 65, // Each lecture is ~65 minutes
        });
      }
    }

    // Sort tasks: high priority first, then medium, then low
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    todayTasks.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

    // Limit to max 8 tasks per day
    const finalTodayTasks = todayTasks.slice(0, 8);

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
    const currentDay = student?.currentDay || 1;
    const programWeek = Math.ceil(currentDay / 7);
    const totalWeeks = Math.ceil((student?.totalDays || 438) / 7);
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
  
  // Check if today or yesterday is in the streak
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
