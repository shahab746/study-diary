import { NextResponse } from 'next/server';
import { testSheetConnection, buildCurriculumHierarchy, fetchSpecialCoursesFromSheet } from '@/lib/sheet-sync';
import { getUserCount } from '@/lib/user-service';

/**
 * Health check endpoint — tests all data sources.
 * GET /api/health
 */
export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    architecture: 'Prisma/SQLite (users + progress) + Google Sheets (curriculum read-only)',
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      VERCEL: !!process.env.VERCEL,
      GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID ? `set (${process.env.GOOGLE_SHEET_ID.substring(0, 8)}...)` : 'using default',
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'set' : 'not set',
    },
    storage: {
      primary: 'prisma-sqlite',
      curriculum: 'google-sheets-csv',
      progress: 'prisma-sqlite',
    },
  };

  // Test 1: Prisma/SQLite connectivity
  try {
    const userCount = await getUserCount();
    diagnostics.database = {
      connected: true,
      userCount,
      type: 'prisma-sqlite',
    };
  } catch (err) {
    diagnostics.database = {
      connected: false,
      error: err instanceof Error ? err.message : String(err),
      type: 'prisma-sqlite',
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
