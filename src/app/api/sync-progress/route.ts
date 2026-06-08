import { NextRequest, NextResponse } from 'next/server';

/**
 * Progress Sync Endpoint — Placeholder
 *
 * Accepts progress data from the client for future sync to Google Sheets.
 * Currently, progress is stored in client-side IndexedDB only.
 * When a Google Sheets API service account is configured, this endpoint
 * can write progress back to the Progress sheet tab.
 *
 * POST /api/sync-progress
 * Body: { phone: string, records: Array<{ topicId, completed, dateCompleted }> }
 */
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

    // Log for now — in the future, write to Google Sheets Progress tab
    console.log(`📤 Sync progress: ${records.length} records for phone=${phone}`);

    // TODO: When googleapis is re-added with a service account:
    // 1. Batch write records to the Progress sheet tab
    // 2. Use sheets.spreadsheets.values.append() or update()

    return NextResponse.json({
      success: true,
      synced: records.length,
      message: 'Progress received. Will be synced to Sheets when write access is configured.',
    });
  } catch (error) {
    console.error('Sync progress error:', error);
    return NextResponse.json(
      { error: 'Failed to sync progress' },
      { status: 500 }
    );
  }
}
