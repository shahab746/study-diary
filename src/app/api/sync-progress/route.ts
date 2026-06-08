import { NextRequest, NextResponse } from 'next/server';
import { fetchProgressFromSheet } from '@/lib/sheet-sync';

/**
 * Progress Sync Endpoint
 *
 * Accepts progress data from the client's IndexedDB and:
 * 1. Validates the data
 * 2. Merges with existing Google Sheets progress (if any)
 * 3. Returns a consolidated view back to the client
 *
 * Since we don't have a Google Sheets API service account for writes,
 * progress is stored in client-side IndexedDB. This endpoint serves as:
 * - A validation/acknowledgement endpoint
 * - A way to reconcile server-side progress with client-side progress
 * - An export endpoint (GET) for downloading progress as CSV
 *
 * POST /api/sync-progress
 * Body: { phone: string, records: Array<{ topicId, completed, dateCompleted }> }
 *
 * GET /api/sync-progress?phone=XXX
 * Returns: Server-side progress merged with IndexedDB progress
 */

// In-memory progress store (resets on server restart, but IndexedDB is source of truth)
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

    // Store progress in server-side cache
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
    let serverRecords: Array<{ topicId: string; completed: boolean; dateCompleted: string }> = [];
    try {
      const sheetProgress = await fetchProgressFromSheet(false);
      const userSheetProgress = sheetProgress.filter(p => p.phone === phone);
      serverRecords = userSheetProgress.map(p => ({
        topicId: p.topicId,
        completed: p.completed,
        dateCompleted: p.dateCompleted,
      }));

      // Merge server records into cache
      for (const sr of serverRecords) {
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
      serverRecordsCount: serverRecords.length,
      totalCached: userCache.size,
      message: 'Progress synced successfully.',
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
 * Returns the consolidated progress data for a user, useful for:
 * - Client reconciliation after login
 * - Exporting progress as data
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

    // Collect from server cache
    const userCache = serverProgressCache.get(phone);
    const cachedRecords: Array<{ topicId: string; completed: boolean; dateCompleted: string }> = [];
    if (userCache) {
      for (const [topicId, data] of userCache) {
        cachedRecords.push({ topicId, ...data });
      }
    }

    // Also collect from Google Sheets
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

    // Merge: server cache takes precedence, then sheet data
    const merged = new Map<string, { topicId: string; completed: boolean; dateCompleted: string }>();
    for (const r of sheetRecords) {
      merged.set(r.topicId, r);
    }
    for (const r of cachedRecords) {
      merged.set(r.topicId, r); // cache overwrites sheet
    }

    const allRecords = Array.from(merged.values());

    // CSV export format
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
