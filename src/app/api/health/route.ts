import { NextResponse } from 'next/server';
import { testSheetConnection, buildCurriculumHierarchy, fetchSpecialCoursesFromSheet } from '@/lib/sheet-sync';
import { isSupabaseConfigured, getSupabase } from '@/lib/supabase';

/**
 * Health check endpoint — tests all data sources.
 * GET /api/health
 */
export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    architecture: 'Supabase (users + progress) + Google Sheets (curriculum read-only)',
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL,
      GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID ? `set (${process.env.GOOGLE_SHEET_ID.substring(0, 8)}...)` : 'using default',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'set' : 'not set',
      SUPABASE_CONFIGURED: isSupabaseConfigured(),
    },
    storage: {
      primary: 'supabase',
      curriculum: 'google-sheets-csv',
      progress: 'supabase',
    },
  };

  // Test 1: Supabase connectivity
  try {
    if (isSupabaseConfigured()) {
      const sb = getSupabase();
      const { count, error } = await sb
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (error) {
        diagnostics.database = {
          connected: false,
          error: error.message,
          type: 'supabase',
        };
      } else {
        diagnostics.database = {
          connected: true,
          userCount: count || 0,
          type: 'supabase',
        };
      }
    } else {
      diagnostics.database = {
        connected: false,
        error: 'Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY',
        type: 'supabase',
      };
    }
  } catch (err) {
    diagnostics.database = {
      connected: false,
      error: err instanceof Error ? err.message : String(err),
      type: 'supabase',
    };
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

  const hasErrors = (diagnostics.sheetConnection as Record<string, unknown>)?.connected === false ||
                    (diagnostics.curriculumData as Record<string, unknown>)?.status === 'failed';

  return NextResponse.json(diagnostics, {
    status: hasErrors ? 500 : 200,
  });
}
