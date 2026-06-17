import { NextResponse } from 'next/server';
import { migrateSheetsToSupabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * POST /api/migrate
 * One-time migration: copies all users from Google Sheets → Supabase
 *
 * Call this once to migrate existing users from Google Sheets into Supabase.
 */
export async function POST() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Supabase is not configured. Set environment variables first.' },
        { status: 503 }
      );
    }

    const result = await migrateSheetsToSupabase();
    return NextResponse.json({
      success: true,
      message: `Migrated ${result.migrated} users from Google Sheets to Supabase (${result.errors} errors)`,
      ...result,
    });
  } catch (error) {
    console.error('Migration error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: `Migration failed: ${message}` },
      { status: 500 }
    );
  }
}
