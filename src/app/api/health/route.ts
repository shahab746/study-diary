import { NextResponse } from 'next/server';
import { testSheetConnection, buildCurriculumHierarchy, fetchSpecialCoursesFromSheet } from '@/lib/sheet-sync';
import { getRegisteredUserCount } from '@/lib/registered-users';
import { isSupabaseConfigured } from '@/lib/supabase';

/**
 * Health check endpoint — tests all data sources.
 * GET /api/health
 */
export async function GET() {
  const supabaseReady = isSupabaseConfigured();

  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    architecture: supabaseReady
      ? 'Supabase (users + progress) + Google Sheets (curriculum read-only)'
      : 'Google Sheets CSV + File Store (fallback — configure Supabase for best experience)',
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL,
      GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID ? `set (${process.env.GOOGLE_SHEET_ID.substring(0, 8)}...)` : 'using default',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'set' : 'not set',
      SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('.supabase.co') ? 'configured' : 'not configured',
    },
    storage: {
      primary: supabaseReady ? 'supabase' : 'file-store',
      curriculum: 'google-sheets-csv',
      progress: supabaseReady ? 'supabase' : 'in-memory-cache',
    },
  };

  // Test 1: Supabase connectivity
  if (supabaseReady) {
    try {
      const { getSupabase } = await import('@/lib/supabase');
      const sb = getSupabase();
      const { count, error } = await sb
        .from('users')
        .select('*', { count: 'exact', head: true });

      diagnostics.supabase = error
        ? { connected: false, error: error.message }
        : { connected: true, userCount: count || 0 };
    } catch (err) {
      diagnostics.supabase = { connected: false, error: err instanceof Error ? err.message : String(err) };
    }
  } else {
    diagnostics.supabase = { connected: false, note: 'Not configured — using file store fallback' };
  }

  // Test 2: Google Sheets connectivity (curriculum)
  try {
    const sheetTest = await testSheetConnection();
    diagnostics.sheetConnection = sheetTest;
  } catch (err) {
    diagnostics.sheetConnection = {
      connected: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Test 3: Curriculum data
  try {
    const subjects = await buildCurriculumHierarchy();
    diagnostics.curriculumData = {
      status: 'ok',
      subjectCount: subjects.length,
      totalTopics: subjects.reduce((sum, s) => sum + s.totalTopics, 0),
    };
  } catch (err) {
    diagnostics.curriculumData = { status: 'failed', error: err instanceof Error ? err.message : String(err) };
  }

  // Test 4: Special courses
  try {
    const courses = await fetchSpecialCoursesFromSheet();
    diagnostics.specialCourses = { status: 'ok', count: courses.length };
  } catch (err) {
    diagnostics.specialCourses = { status: 'failed', error: err instanceof Error ? err.message : String(err) };
  }

  // Test 5: Registration (file store count)
  try {
    diagnostics.registration = {
      status: 'ok',
      serverCacheUsers: getRegisteredUserCount(),
      storage: supabaseReady ? 'supabase' : 'file-store',
    };
  } catch (err) {
    diagnostics.registration = { status: 'failed', error: err instanceof Error ? err.message : String(err) };
  }

  const hasErrors = (diagnostics.sheetConnection as any)?.connected === false ||
                    (diagnostics.curriculumData as any)?.status === 'failed';

  return NextResponse.json(diagnostics, {
    status: hasErrors ? 500 : 200,
  });
}
