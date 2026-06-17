import { NextResponse } from 'next/server';
import { migrateUsersFromSheets } from '@/lib/user-service';

/**
 * POST /api/migrate
 * One-time migration: copies all users from Google Sheets → SQLite (Prisma)
 *
 * Call this once to migrate existing users from Google Sheets into the local database.
 */
export async function POST() {
  try {
    const result = await migrateUsersFromSheets();
    return NextResponse.json({
      success: true,
      message: `Migrated ${result.migrated} users from Google Sheets to SQLite (${result.errors} errors, ${result.skipped} already existed)`,
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
