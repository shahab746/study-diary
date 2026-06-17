import { NextResponse } from 'next/server';
import { migrateUsersFromSheets } from '@/lib/user-service';
import { invalidateCache } from '@/lib/sheet-sync';

/**
 * Sync endpoint — migrates Google Sheets users to SQLite (Prisma).
 * Curriculum reads directly from Sheets (no DB sync needed).
 *
 * GET /api/sync?type=users       — Migrate users from Sheets to SQLite
 * GET /api/sync?type=curriculum  — Info only (curriculum reads from Sheets live)
 * GET /api/sync?type=full        — Migrate users + info
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'users';

    if (type === 'users') {
      const result = await migrateUsersFromSheets();
      invalidateCache();
      return NextResponse.json({ success: true, ...result });
    }

    if (type === 'curriculum') {
      return NextResponse.json({
        success: true,
        message: 'Curriculum reads directly from Google Sheets — no sync needed',
      });
    }

    if (type === 'full') {
      const userResult = await migrateUsersFromSheets();
      invalidateCache();
      return NextResponse.json({
        success: true,
        users: userResult,
        curriculum: { message: 'Curriculum reads directly from Google Sheets' },
      });
    }

    return NextResponse.json({ error: 'Invalid sync type. Use "users", "curriculum", or "full"' }, { status: 400 });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Sync failed: ' + String(error) }, { status: 500 });
  }
}
