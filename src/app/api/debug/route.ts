import { db } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint — quickly checks what data exists in the database.
 * GET /api/debug
 */
export async function GET() {
  try {
    const results: Record<string, unknown> = {};

    // Count records in each table
    const studentCount = await db.student.count?.() ?? (await db.student.findMany()).length;
    const subjectCount = await db.subject.count?.() ?? (await db.subject.findMany()).length;
    const topicCount = await db.topic.count?.() ?? (await db.topic.findMany()).length;
    const progressCount = await db.progress.count?.() ?? (await db.progress.findMany()).length;

    results.counts = { students: studentCount, subjects: subjectCount, topics: topicCount, progress: progressCount };

    // Get all students (limited info)
    const students = await db.student.findMany();
    results.students = students.map((s: any) => ({
      name: s.name, phone: s.phone, grade: s.grade, board: s.board, field: s.field,
      currentDay: s.currentDay, totalDays: s.totalDays, pacingGoal: s.pacingGoal,
      academicGroup: s.academicGroup, status: s.status,
    }));

    // Get all subjects (limited info)
    const subjects = await db.subject.findMany({ orderBy: { order: 'asc' } });
    results.subjects = subjects.map((s: any) => ({
      id: s.id, name: s.name, grade: s.grade, board: s.board, field: s.field,
      totalTopics: s.totalTopics, chapterCount: s.chapterCount, color: s.color,
      groupEligibility: s.groupEligibility,
    }));

    // Get chapter counts per subject
    const chapters = await db.chapter.findMany();
    const chapterBySubject = new Map<string, number>();
    for (const ch of chapters) {
      const count = chapterBySubject.get(ch.subjectId) || 0;
      chapterBySubject.set(ch.subjectId, count + 1);
    }
    results.chapterCountsBySubject = Object.fromEntries(chapterBySubject);

    // Get topic counts per chapter
    const allTopics = await db.topic.findMany();
    const topicsByChapter = new Map<string, number>();
    for (const t of allTopics) {
      const count = topicsByChapter.get(t.chapterId) || 0;
      topicsByChapter.set(t.chapterId, count + 1);
    }
    results.topicCountsByChapter = Object.fromEntries(topicsByChapter);

    // Check if the subject findMany with include works
    try {
      const subjectsWithChapters = await db.subject.findMany({
        where: { grade: { in: ['9', 'Grade 9', '10', 'Grade 10'] } },
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

      results.subjectsWithChapters = subjectsWithChapters.map((s: any) => ({
        id: s.id,
        name: s.name,
        grade: s.grade,
        chapterCount: s.chapters?.length || 0,
        topicCount: s.chapters?.reduce((sum: number, ch: any) => sum + (ch.topics?.length || 0), 0) || 0,
      }));
    } catch (incErr) {
      results.subjectsWithChaptersError = incErr instanceof Error ? incErr.message : String(incErr);
    }

    results.isTurso = !!process.env.LIBSQL_URL;
    results.timestamp = new Date().toISOString();

    return NextResponse.json(results);
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined,
    }, { status: 500 });
  }
}
