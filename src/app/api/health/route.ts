import { NextResponse } from 'next/server';
import { testSheetConnection, buildCurriculumHierarchy, fetchSpecialCoursesFromSheet } from '@/lib/sheet-sync';

/**
 * Health check endpoint — tests Google Sheets connectivity.
 * GET /api/health
 */
export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    architecture: 'Google Sheets CSV + IndexedDB (zero-database)',
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL,
      GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID ? `set (${process.env.GOOGLE_SHEET_ID.substring(0, 8)}...)` : 'using default',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'set' : 'not set',
    },
  };

  // Test 1: Google Sheets connectivity
  try {
    const sheetTest = await testSheetConnection();
    diagnostics.sheetConnection = sheetTest;
  } catch (err) {
    diagnostics.sheetConnection = {
      connected: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Test 2: Curriculum data availability
  try {
    const subjects = await buildCurriculumHierarchy();
    diagnostics.curriculumData = {
      status: 'ok',
      subjectCount: subjects.length,
      totalTopics: subjects.reduce((sum, s) => sum + s.totalTopics, 0),
    };
  } catch (err) {
    diagnostics.curriculumData = {
      status: 'failed',
      error: err instanceof Error ? err.message : String(err),
    };
  }

  // Test 3: Special courses
  try {
    const courses = await fetchSpecialCoursesFromSheet();
    diagnostics.specialCourses = { status: 'ok', count: courses.length };
  } catch (err) {
    diagnostics.specialCourses = { status: 'failed', error: err instanceof Error ? err.message : String(err) };
  }

  const hasErrors = (diagnostics.sheetConnection as any)?.connected === false ||
                    (diagnostics.curriculumData as any)?.status === 'failed';

  return NextResponse.json(diagnostics, {
    status: hasErrors ? 500 : 200,
  });
}
