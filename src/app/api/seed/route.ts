import { NextResponse } from 'next/server';
import { migrateUsersFromSheets } from '@/lib/user-service';

/**
 * Seed / Migrate endpoint — syncs Google Sheets users into SQLite (Prisma).
 *
 * GET /api/seed              — Migrates users from Sheets to SQLite
 * GET /api/seed?type=users   — Migrates users only
 * GET /api/seed?type=curriculum — Info only (curriculum reads from Sheets live)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'full';

    const results: Record<string, unknown> = { timestamp: new Date().toISOString() };

    if (type === 'users' || type === 'full') {
      results.users = await migrateUsersFromSheets();
    }

    if (type === 'curriculum' || type === 'full') {
      results.curriculum = {
        status: 'ok',
        message: 'Curriculum reads directly from Google Sheets — no seeding needed',
      };
    }

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
