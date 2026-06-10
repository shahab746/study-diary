import { NextRequest, NextResponse } from 'next/server';
import {
  syncProgressToSupabase,
  getUserProgress,
  isSupabaseConfigured,
} from '@/lib/supabase';
import { fetchProgressFromSheet } from '@/lib/sheet-sync';

/**
 * Progress Sync Endpoint
 *
 * POST /api/sync-progress
 * Body: { phone: string, records: Array<{ topicId, completed, dateCompleted }> }
 *
 * Now persists to Supabase (not just in-memory cache!)
 * Falls back to in-memory cache if Supabase is not configured.
 *
 * GET /api/sync-progress?phone=XXX
 * Returns the consolidated progress data for a user
 */

// In-memory fallback cache (only used when Supabase is not configured)
const serverProgressCache = new Map<string, Map<string, { completed: boolean; dateCompleted: string }>>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, records } = body;

    if (!phone || !Array.isArray(records)) {
      return NextResponse.json(
        { error: 'Missing phone or records array' },
        { status: 400 }
      );
    }

    // ── Supabase: persist progress permanently ──
    if (isSupabaseConfigured()) {
      const result = await syncProgressToSupabase(phone, records);
      return NextResponse.json({
        success: true,
        synced: result.synced,
        merged: result.merged,
        storage: 'supabase',
        message: 'Progress synced and persisted to Supabase.',
      });
    }

    // ── Fallback: in-memory cache ──
    let userCache = serverProgressCache.get(phone);
    if (!userCache) {
      userCache = new Map();
      serverProgressCache.set(phone, userCache);
    }

    let merged = 0;
    for (const record of records) {
      if (!record.topicId) continue;
      const existing = userCache.get(record.topicId);
      if (!existing || new Date(record.dateCompleted) > new Date(existing.dateCompleted)) {
        userCache.set(record.topicId, {
          completed: !!record.completed,
          dateCompleted: record.dateCompleted || new Date().toISOString(),
        });
        merged++;
      }
    }

    // Also try to fetch server-side progress from Google Sheets for reconciliation
    let serverRecordsCount = 0;
    try {
      const sheetProgress = await fetchProgressFromSheet(false);
      const userSheetProgress = sheetProgress.filter(p => p.phone === phone);
      serverRecordsCount = userSheetProgress.length;

      for (const sr of userSheetProgress) {
        if (!userCache.has(sr.topicId)) {
          userCache.set(sr.topicId, {
            completed: sr.completed,
            dateCompleted: sr.dateCompleted,
          });
        }
      }
    } catch {
      // Google Sheets unavailable — that's OK
    }

    return NextResponse.json({
      success: true,
      synced: records.length,
      merged,
      serverRecordsCount,
      totalCached: userCache.size,
      storage: 'memory-cache',
      message: 'Progress synced (in-memory only — configure Supabase for persistence).',
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
 * Returns the consolidated progress data for a user
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone');
    const format = url.searchParams.get('format'); // 'json' or 'csv'

    if (!phone) {
      return NextResponse.json(
        { error: 'Phone parameter required' },
        { status: 400 }
      );
    }

    // ── Supabase: read from persistent storage ──
    if (isSupabaseConfigured()) {
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
    }

    // ── Fallback: in-memory cache + Google Sheets ──
    const userCache = serverProgressCache.get(phone);
    const cachedRecords: Array<{ topicId: string; completed: boolean; dateCompleted: string }> = [];
    if (userCache) {
      for (const [topicId, data] of userCache) {
        cachedRecords.push({ topicId, ...data });
      }
    }

    let sheetRecords: Array<{ topicId: string; completed: boolean; dateCompleted: string }> = [];
    try {
      const sheetProgress = await fetchProgressFromSheet(false);
      sheetRecords = sheetProgress
        .filter(p => p.phone === phone)
        .map(p => ({
          topicId: p.topicId,
          completed: p.completed,
          dateCompleted: p.dateCompleted,
        }));
    } catch {
      // Sheets unavailable
    }

    const merged = new Map<string, { topicId: string; completed: boolean; dateCompleted: string }>();
    for (const r of sheetRecords) {
      merged.set(r.topicId, r);
    }
    for (const r of cachedRecords) {
      merged.set(r.topicId, r);
    }

    const allRecords = Array.from(merged.values());

    if (format === 'csv') {
      const csvLines = ['topicId,completed,dateCompleted'];
      for (const r of allRecords) {
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
      source: 'memory-cache+sheets',
      totalRecords: allRecords.length,
      records: allRecords,
    });
  } catch (error) {
    console.error('Get progress error:', error);
    return NextResponse.json(
      { error: 'Failed to get progress' },
      { status: 500 }
    );
  }
}
