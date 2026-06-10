import { NextResponse } from 'next/server';
import { migrateSheetsToSupabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * Seed / Migrate endpoint — syncs Google Sheets users into Supabase.
 *
 * GET /api/seed              — Migrates users from Sheets to Supabase
 * GET /api/seed?type=users   — Migrates users only
 * GET /api/seed?type=curriculum — Info only (curriculum reads from Sheets live)
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'full';

    const results: Record<string, unknown> = { timestamp: new Date().toISOString() };

    if (!isSupabaseConfigured()) {
      return NextResponse.json({
        success: false,
        error: 'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env',
      }, { status: 400 });
    }

    if (type === 'users' || type === 'full') {
      results.users = await migrateSheetsToSupabase();
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
