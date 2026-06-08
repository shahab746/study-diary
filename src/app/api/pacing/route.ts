import { NextResponse } from 'next/server';

/**
 * Pacing endpoint — No-op (pacing goals are stored in client-side IndexedDB)
 *
 * POST /api/pacing
 * Body: { pacingGoal, studentPhone }
 *
 * Returns success immediately. The client writes pacing goals to IndexedDB directly.
 */
export async function POST() {
  // Calculate default topics per day for each pacing goal
  return NextResponse.json({
    success: true,
    topicsPerDay: 4,
    message: 'Pacing goals are stored locally in IndexedDB',
  });
}
