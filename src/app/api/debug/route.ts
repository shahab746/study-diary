import { NextResponse } from 'next/server';
import {
  fetchUsersFromSheet,
  buildCurriculumHierarchy,
  fetchSpecialCoursesFromSheet,
  fetchProgressFromSheet,
} from '@/lib/sheet-sync';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint — shows data counts from Google Sheets.
 * GET /api/debug
 */
export async function GET() {
  try {
    const results: Record<string, unknown> = {};

    const [users, subjects, courses, progress] = await Promise.all([
      fetchUsersFromSheet(false),
      buildCurriculumHierarchy(),
      fetchSpecialCoursesFromSheet(),
      fetchProgressFromSheet(),
    ]);

    results.counts = {
      students: users.length,
      subjects: subjects.length,
      topics: subjects.reduce((sum, s) => sum + s.totalTopics, 0),
      specialCourses: courses.length,
      progressRecords: progress.length,
    };

    results.students = users.map(u => ({
      name: u.name, phone: u.phone, grade: u.grade, board: u.board, field: u.field,
      currentDay: u.currentDay, totalDays: u.totalDays, pacingGoal: u.pacingGoal || '5M',
      academicGroup: u.academicGroup, status: u.status,
    }));

    results.subjects = subjects.map(s => ({
      id: s.id, name: s.name, grade: s.grade, board: s.board, field: s.field,
      totalTopics: s.totalTopics, chapterCount: s.chapterCount, color: s.color,
      groupEligibility: s.groupEligibility,
    }));

    results.architecture = 'Google Sheets CSV + IndexedDB (zero-database)';
    results.timestamp = new Date().toISOString();

    return NextResponse.json(results);
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
