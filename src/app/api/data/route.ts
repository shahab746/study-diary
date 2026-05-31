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

    // Build today's tasks based on currentDay
    const currentDay = student?.currentDay || 1;
    const allTopics = subjects.flatMap(s => s.chapters.flatMap(ch => ch.topics));
    const todayTopics = allTopics
      .filter(t => t.dayNumber <= currentDay + 4 && t.dayNumber >= currentDay)
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .slice(0, 8);

    const todayTasks = todayTopics.map(topic => {
      const chapter = subjects.flatMap(s => s.chapters).find(ch => ch.id === topic.chapterId);
      const subject = subjects.find(s => s.chapters.some(ch => ch.id === topic.chapterId));
      const progressRecord = progress.find(p => p.topicId === topic.id);
      return {
        topicId: topic.id,
        topicName: topic.name,
        dayNumber: topic.dayNumber,
        subjectName: subject?.name || '',
        subjectColor: subject?.color || '',
        chapterName: chapter?.name || '',
        completed: progressRecord?.completed || false,
        videoLink: topic.videoLink,
        pdfLink: topic.pdfLink,
      };
    });

    // Performance data - simulated monthly breakdown
    const performanceData = [
      { month: 'May', lectures: completedCountForMonth(progress, 5) },
      { month: 'Jun', lectures: completedCountForMonth(progress, 6) },
      { month: 'Jul', lectures: completedCountForMonth(progress, 7) },
    ];

    // Pacing calculation
    const totalTopicsCount = allTopics.length;
    const totalCompleted = progress.filter(p => p.completed).length;
    const daysLeft = student?.daysLeft || 423;
    const topicsPerDay = daysLeft > 0 ? Math.ceil((totalTopicsCount - totalCompleted) / daysLeft) : 0;

    // Pacing goals
    const pacingGoals = {
      '3M': { months: 3, targetDate: getTargetDate(3), topicsPerDay: Math.ceil((totalTopicsCount - totalCompleted) / 90) },
      '5M': { months: 5, targetDate: getTargetDate(5), topicsPerDay: Math.ceil((totalTopicsCount - totalCompleted) / 150) },
      '6M': { months: 6, targetDate: getTargetDate(6), topicsPerDay: Math.ceil((totalTopicsCount - totalCompleted) / 180) },
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
      todayTasks,
      performanceData,
      pacingGoals,
      config: configMap,
      totalTopics: totalTopicsCount,
      totalCompleted,
      topicsPerDay,
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

function getTargetDate(months: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
}
