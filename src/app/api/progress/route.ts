import { NextResponse } from 'next/server';

/**
 * Progress endpoint — No-op (progress is stored in client-side IndexedDB)
 *
 * POST /api/progress
 * Body: { topicId, studentPhone, completed }
 *
 * Returns success immediately. The client writes progress to IndexedDB directly.
 */
export async function POST() {
  return NextResponse.json({ success: true, message: 'Progress is stored locally in IndexedDB' });
}
