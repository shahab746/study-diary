import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

// ─── Color & Icon Mapping (same as /api/data) ─────────────────────────────────
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
function mapIcon(icon: string, name?: string): string {
  if (name && SUBJECT_ICON_MAP[name]) return SUBJECT_ICON_MAP[name];
  return 'book';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params;
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone') || '';
    const isTurso = !!process.env.LIBSQL_URL;

    if (isTurso) {
      // Use batch SQL instead of N+1 queries
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createClient } = require('@libsql/client') as typeof import('@libsql/client');
      const client = createClient({
        url: process.env.LIBSQL_URL!,
        authToken: process.env.LIBSQL_AUTH_TOKEN || undefined,
      });

      // Fetch subject, chapters, topics, and progress in parallel
      // Also fetch student if phone provided (for eligibility check)
      const queries: Promise<any>[] = [
        client.execute({ sql: 'SELECT * FROM Subject WHERE id = ?', args: [subjectId] }),
        client.execute({ sql: 'SELECT * FROM Chapter WHERE subjectId = ? ORDER BY number ASC', args: [subjectId] }),
        client.execute({
          sql: `SELECT t.* FROM Topic t 
                 INNER JOIN Chapter c ON t.chapterId = c.id 
                 WHERE c.subjectId = ? 
                 ORDER BY c.number ASC, t.number ASC`,
          args: [subjectId],
        }),
        phone
          ? client.execute({ sql: 'SELECT * FROM Progress WHERE studentPhone = ?', args: [phone] })
          : Promise.resolve({ rows: [] }),
      ];

      // Add student query for eligibility check
      if (phone) {
        queries.push(client.execute({ sql: 'SELECT academicGroup FROM Student WHERE phone = ?', args: [phone] }));
      }

      const results = await Promise.all(queries);
      const [subjectResult, chaptersResult, topicsResult, progressResult, studentResult] = results;

      // NOW safe to close client
      client.close();

      if (!subjectResult.rows[0]) {
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }

      // Convert rows to camelCase
      const toCamel = (row: any) => {
        const result: any = {};
        for (const [key, value] of Object.entries(row as Record<string, any>)) {
          const camelKey = key.replace(/_([a-z])/g, (_: string, c: string) => c.toUpperCase());
          result[camelKey] = value;
        }
        return result;
      };

      const subject = toCamel(subjectResult.rows[0]);
      const chapters = chaptersResult.rows.map(toCamel);
      const topics = topicsResult.rows.map(toCamel);
      const progressRows = progressResult.rows.map(toCamel);

      // Check Group_Eligibility
      if (subject.groupEligibility && subject.groupEligibility !== 'Both' && phone && studentResult) {
        const studentRow = studentResult.rows[0];
        const userGroup = studentRow ? String((studentRow as any).academicGroup || '') : '';
        if (userGroup && subject.groupEligibility !== userGroup) {
          return NextResponse.json({ error: 'Not eligible for this subject' }, { status: 403 });
        }
      }

      // Build progress lookup
      const completedTopicIds = new Set(
        progressRows.filter((p: any) => p.completed).map((p: any) => p.topicId)
      );

      // Group topics by chapter
      const topicsByChapter = new Map<string, any[]>();
      for (const t of topics) {
        const list = topicsByChapter.get(t.chapterId) || [];
        list.push(t);
        topicsByChapter.set(t.chapterId, list);
      }

      // Build result
      const result = {
        id: subject.id,
        name: subject.name,
        color: mapColor(subject.color),
        icon: mapIcon(subject.icon, subject.name),
        grade: subject.grade,
        board: subject.board,
        field: subject.field,
        totalTopics: subject.totalTopics,
        chapterCount: subject.chapterCount,
        chapters: chapters.map(ch => ({
          id: ch.id,
          number: ch.number,
          name: ch.name,
          topics: (topicsByChapter.get(ch.id) || []).map((t: any) => ({
            id: t.id,
            number: t.number,
            name: t.name,
            videoLink: t.videoLink || '',
            pdfLink: t.pdfLink || '',
            hasVideo: !!(t.videoLink && t.videoLink.startsWith('http')),
            hasPdf: !!(t.pdfLink && t.pdfLink.startsWith('http')),
            dayNumber: t.dayNumber || 0,
            completed: completedTopicIds.has(t.id),
            isFree: !!t.isFree,
          })),
          completedTopics: (topicsByChapter.get(ch.id) || []).filter((t: any) => completedTopicIds.has(t.id)).length,
          totalTopics: (topicsByChapter.get(ch.id) || []).length,
        })),
        completedTopics: topics.filter((t: any) => completedTopicIds.has(t.id)).length,
      };

      return NextResponse.json(result);
    } else {
      // Local: use Prisma (efficient locally with includes)
      const subject = await db.subject.findUnique({
        where: { id: subjectId },
        select: {
          id: true, name: true, color: true, icon: true,
          grade: true, board: true, field: true,
          totalTopics: true, chapterCount: true, groupEligibility: true,
          chapters: {
            orderBy: { number: 'asc' },
            select: {
              id: true, number: true, name: true,
              topics: {
                orderBy: { number: 'asc' },
                select: {
                  id: true, number: true, name: true,
                  videoLink: true, pdfLink: true, dayNumber: true, isFree: true,
                  progress: {
                    where: phone ? { studentPhone: phone } : {},
                    select: { completed: true },
                  },
                },
              },
            },
          },
        },
      });

      if (!subject) {
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }

      // Check Group_Eligibility
      if (subject.groupEligibility && subject.groupEligibility !== 'Both' && phone) {
        const localStudent = await db.student.findUnique({
          where: { phone },
          select: { academicGroup: true },
        });
        const userGroup = localStudent?.academicGroup || '';
        if (userGroup && subject.groupEligibility !== userGroup) {
          return NextResponse.json({ error: 'Not eligible for this subject' }, { status: 403 });
        }
      }

      const result = {
        id: subject.id,
        name: subject.name,
        color: mapColor(subject.color),
        icon: mapIcon(subject.icon, subject.name),
        grade: subject.grade,
        board: subject.board,
        field: subject.field,
        totalTopics: subject.totalTopics,
        chapterCount: subject.chapterCount,
        chapters: subject.chapters.map(ch => ({
          id: ch.id,
          number: ch.number,
          name: ch.name,
          topics: ch.topics.map(t => ({
            id: t.id,
            number: t.number,
            name: t.name,
            videoLink: t.videoLink,
            pdfLink: t.pdfLink,
            hasVideo: !!(t.videoLink && t.videoLink.startsWith('http')),
            hasPdf: !!(t.pdfLink && t.pdfLink.startsWith('http')),
            dayNumber: t.dayNumber,
            completed: t.progress.some((p: any) => p.completed),
            isFree: !!t.isFree,
          })),
          completedTopics: ch.topics.filter((t: any) => t.progress.some((p: any) => p.completed)).length,
          totalTopics: ch.topics.length,
        })),
        completedTopics: subject.chapters.reduce(
          (sum: number, ch: any) => sum + ch.topics.filter((t: any) => t.progress.some((p: any) => p.completed)).length, 0
        ),
      };

      return NextResponse.json(result);
    }
  } catch (error) {
    console.error('Error fetching subject:', error);
    return NextResponse.json({
      error: 'Failed to fetch subject',
      detail: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
