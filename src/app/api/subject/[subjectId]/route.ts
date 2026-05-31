import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params;
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone') || '';

    const subject = await db.subject.findUnique({
      where: { id: subjectId },
      include: {
        chapters: {
          orderBy: { number: 'asc' },
          include: {
            topics: {
              orderBy: { number: 'asc' },
              include: {
                progress: {
                  where: phone ? { studentPhone: phone } : {},
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

    const result = {
      id: subject.id,
      name: subject.name,
      color: subject.color,
      icon: subject.icon,
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
          completed: t.progress.some(p => p.completed),
        })),
        completedTopics: ch.topics.filter(t => t.progress.some(p => p.completed)).length,
        totalTopics: ch.topics.length,
      })),
      completedTopics: subject.chapters.reduce(
        (sum, ch) => sum + ch.topics.filter(t => t.progress.some(p => p.completed)).length, 0
      ),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching subject:', error);
    return NextResponse.json({ error: 'Failed to fetch subject' }, { status: 500 });
  }
}
