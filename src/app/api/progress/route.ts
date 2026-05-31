import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { writeProgressToSheet } from '@/lib/sheet-sync';

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

    // Update student's topicsDone count
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

    // 2. Write back to Google Sheet (async, non-blocking)
    // Get the topic's subject and chapter info for the sheet reference
    const topic = await db.topic.findUnique({
      where: { id: topicId },
      include: { chapter: { include: { subject: true } } },
    });

    if (topic) {
      // Create a sheet-compatible topic ID (Subject_Chapter_Topic format)
      const sheetTopicId = `${topic.chapter.subject.name}_${topic.chapter.number}_${topic.number}`;
      
      // Fire-and-forget write to Google Sheet
      writeProgressToSheet(studentPhone, sheetTopicId, completed).catch(err => {
        console.warn('Sheet write-back failed (non-critical):', err.message);
      });
    }

    return NextResponse.json({ success: true, progress });
  } catch (error) {
    console.error('Error updating progress:', error);
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
