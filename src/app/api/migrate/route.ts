import { NextResponse } from 'next/server';
import { migrateSheetsToSupabase, isSupabaseConfigured } from '@/lib/supabase';

/**
 * POST /api/migrate
 * One-time migration: copies all users from Google Sheets → Supabase
 *
 * Call this once after setting up Supabase to migrate existing users.
 */
export async function POST() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { success: false, error: 'Supabase not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env' },
      { status: 400 }
    );
  }

  try {
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
