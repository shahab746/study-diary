import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { pacingGoal, studentPhone } = body;

    if (!pacingGoal || !studentPhone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const student = await db.student.findFirst({
      where: { phone: studentPhone },
    });

    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 });
    }

    // Calculate new target date based on pacing goal
    const monthsMap: Record<string, number> = { '3M': 3, '5M': 5, '6M': 6 };
    const months = monthsMap[pacingGoal] || 5;
    const newTargetDate = new Date();
    newTargetDate.setMonth(newTargetDate.getMonth() + months);

    // Calculate new days left and total days
    const newTotalDays = Math.ceil((newTargetDate.getTime() - student.startDate.getTime()) / (1000 * 60 * 60 * 24));
    const newDaysLeft = Math.ceil((newTargetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));

    await db.student.update({
      where: { id: student.id },
      data: {
        pacingGoal,
        targetDate: newTargetDate,
        totalDays: newTotalDays,
        daysLeft: newDaysLeft,
      },
    });

    // Calculate topics per day
    const totalCompleted = await db.progress.count({
      where: { studentPhone, completed: true },
    });
    const totalTopics = await db.topic.count();
    const topicsPerDay = newDaysLeft > 0 ? Math.ceil((totalTopics - totalCompleted) / newDaysLeft) : 0;

    return NextResponse.json({
      success: true,
      pacingGoal,
      targetDate: newTargetDate.toISOString().split('T')[0],
      daysLeft: newDaysLeft,
      totalDays: newTotalDays,
      topicsPerDay,
    });
  } catch (error) {
    console.error('Error updating pacing:', error);
    return NextResponse.json({ error: 'Failed to update pacing' }, { status: 500 });
  }
}
