import { NextRequest, NextResponse } from 'next/server';
import {
  syncProgressToSupabase,
  getUserProgress,
  isSupabaseConfigured,
} from '@/lib/supabase';

/**
 * Progress Sync Endpoint — Supabase
 *
 * POST /api/sync-progress
 * Body: { phone: string, records: Array<{ topicId, completed, dateCompleted }> }
 *
 * GET /api/sync-progress?phone=XXX
 * Returns the progress data for a user from Supabase
 */

export async function POST(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { phone, records } = body;

    if (!phone || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Missing phone or records array' },
        { status: 400 }
      );
    }

    const result = await syncProgressToSupabase(phone, records);
    return NextResponse.json({
      success: true,
      synced: result.synced,
      merged: result.merged,
      storage: 'supabase',
    });
  } catch (error) {
    console.error('Sync progress error:', error);
    return NextResponse.json(
      { error: 'Failed to sync progress' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/sync-progress?phone=XXX
 * Returns the progress data for a user from Supabase
 */
export async function GET(request: NextRequest) {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const url = new URL(request.url);
    const phone = url.searchParams.get('phone');
    const format = url.searchParams.get('format');

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone parameter required' },
        { status: 400 }
      );
    }

    const progress = await getUserProgress(phone);
    const records = progress.map(p => ({
      topicId: p.topic_id,
      completed: p.completed,
      dateCompleted: p.date_completed || '',
    }));

    if (format === 'csv') {
      const csvLines = ['topicId,completed,dateCompleted'];
      for (const r of records) {
        csvLines.push(`${r.topicId},${r.completed},${r.dateCompleted}`);
      }
      return new NextResponse(csvLines.join('\n'), {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="progress-${phone}.csv"`,
        },
      });
    }

    return NextResponse.json({
      phone,
      source: 'supabase',
      totalRecords: records.length,
      records,
    });
  } catch (error) {
    console.error('Get progress error:', error);
    return NextResponse.json(
      { error: 'Failed to get progress' },
      { status: 500 }
    );
  }
}
