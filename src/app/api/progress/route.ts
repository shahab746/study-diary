import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { topicId, studentPhone, completed } = body;

    if (!topicId || !studentPhone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 1. Save to local DB (fast, always works)
    const progress = await db.progress.upsert({
      where: {
        topicId_studentPhone: {
          topicId,
          studentPhone,
        },
      },
      create: {
        topicId,
        studentPhone,
        completed,
        dateCompleted: completed ? new Date() : null,
      },
      update: {
        completed,
        dateCompleted: completed ? new Date() : null,
      },
    });

    // 2. Update student's topicsDone count (use a simple count query)
    const totalCompleted = await db.progress.count({
      where: {
        studentPhone,
        completed: true,
      },
    });

    if (studentPhone) {
      const student = await db.student.findFirst({
        where: { phone: studentPhone },
      });
      if (student) {
        await db.student.update({
          where: { id: student.id },
          data: { topicsDone: totalCompleted },
        });
      }
    }

    return NextResponse.json({ success: true, progress });
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json({
      error: 'Failed to update progress',
      detail: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
