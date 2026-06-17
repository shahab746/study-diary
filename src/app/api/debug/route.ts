import { NextResponse } from 'next/server';
import {
  fetchUsersFromSheet,
  buildCurriculumHierarchy,
  fetchSpecialCoursesFromSheet,
  fetchProgressFromSheet,
  findUserByPhone as findUserByPhoneSheet,
} from '@/lib/sheet-sync';
import {
  findUserByPhone as findUserByPhoneDB,
  dbUserToSheetUser,
  isSupabaseConfigured,
  getUserProgress,
} from '@/lib/supabase';
import { findRegisteredUserByPhone } from '@/lib/registered-users';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint — shows data counts and user lookup.
 * GET /api/debug              → general stats
 * GET /api/debug?phone=03XXX  → detailed user lookup across all sources
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone');

    // ── Phone-based user lookup ──
    if (phone) {
      const cleanPhone = phone.trim();
      const lookup: Record<string, any> = { phone: cleanPhone };

      // 1. Supabase
      if (isSupabaseConfigured()) {
        const dbUser = await findUserByPhoneDB(cleanPhone);
        if (dbUser) {
          lookup.supabase = {
            found: true,
            name: dbUser.name,
            status: dbUser.status,
            grade: dbUser.grade,
            board: dbUser.board,
            academic_group: dbUser.academic_group,
            pin: dbUser.pin,
            topics_done: dbUser.topics_done,
          };
          // Also check progress
          const progress = await getUserProgress(cleanPhone);
          lookup.supabase.progressCount = progress.length;
          lookup.supabase.completedCount = progress.filter(p => p.completed).length;
        } else {
          lookup.supabase = { found: false };
        }
      } else {
        lookup.supabase = { configured: false };
      }

      // 2. Google Sheets
      try {
        const sheetUser = await findUserByPhoneSheet(cleanPhone, true);
        if (sheetUser) {
          lookup.googleSheets = {
            found: true,
            name: sheetUser.name,
            status: sheetUser.status,
            normalizedStatus: normalizeStatus(sheetUser.status),
            grade: sheetUser.grade,
            board: sheetUser.board,
            academicGroup: sheetUser.academicGroup,
            pin: sheetUser.pin,
          };
        } else {
          lookup.googleSheets = { found: false };
        }
      } catch (err: any) {
        lookup.googleSheets = { error: err.message };
      }

      // 3. Registered-users cache
      try {
        const cachedUser = await findRegisteredUserByPhone(cleanPhone, false);
        if (cachedUser) {
          lookup.registeredUsersCache = {
            found: true,
            name: cachedUser.name,
            status: cachedUser.status,
            normalizedStatus: normalizeStatus(cachedUser.status),
            grade: cachedUser.grade,
            board: cachedUser.board,
            academicGroup: cachedUser.academicGroup,
            pin: cachedUser.pin,
          };
        } else {
          lookup.registeredUsersCache = { found: false };
        }
      } catch (err: any) {
        lookup.registeredUsersCache = { error: err.message };
      }

      // Verdict
      const sources = [lookup.supabase, lookup.googleSheets, lookup.registeredUsersCache];
      const foundInAny = sources.some(s => s?.found);
      const paidInAny = sources.some(s => s?.found && s?.normalizedStatus === 'paid');
      lookup.verdict = {
        userExists: foundInAny,
        effectiveStatus: paidInAny ? 'paid' : (foundInAny ? 'free' : 'not_found'),
        canAccessCurriculum: foundInAny,
        canAccessPremiumContent: paidInAny,
      };

      return NextResponse.json(lookup);
    }

    // ── General stats (no phone provided) ──
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

    results.architecture = 'Google Sheets CSV + Supabase + Local Cache';
    results.timestamp = new Date().toISOString();

    return NextResponse.json(results);
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

function normalizeStatus(status: string): string {
  if (!status) return 'free';
  const s = status.toLowerCase().trim();
  if (s === 'true' || s === 'paid') return 'paid';
  if (s === 'false' || s === 'free') return 'free';
  if (s === 'blocked' || s === 'disabled') return s;
  return s;
}
