import { NextResponse } from 'next/server';
import {
  buildCurriculumHierarchyFromDb,
  fetchSpecialCoursesFromDb,
} from '@/lib/curriculum-service';
import {
  findUserByPhone,
  dbUserToSheetUser,
  getUserProgress,
  isSupabaseConfigured,
  getSupabase,
} from '@/lib/supabase';

function normalizeStatus(status: string): string {
  if (!status) return 'free';
  const s = status.toLowerCase().trim();
  if (s === 'true' || s === 'paid') return 'paid';
  if (s === 'false' || s === 'free') return 'free';
  if (s === 'blocked' || s === 'disabled') return s;
  return s;
}

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint — user lookup + stats.
 * GET /api/debug              → general stats
 * GET /api/debug?phone=03XXX  → detailed user lookup in Supabase
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone');

    // ── Phone-based user lookup (Supabase) ──
    if (phone) {
      const cleanPhone = phone.trim();
      const lookup: Record<string, unknown> = { phone: cleanPhone };

      const dbUser = await findUserByPhone(cleanPhone);
      if (dbUser) {
        const su = dbUserToSheetUser(dbUser);
        const status = normalizeStatus(su.status);
        const progress = await getUserProgress(cleanPhone);

        lookup.database = {
          found: true,
          name: su.name,
          status: su.status,
          normalizedStatus: status,
          grade: su.grade,
          board: su.board,
          academicGroup: su.academicGroup,
          pin: su.pin,
          topicsDone: su.topicsDone,
          progressCount: progress.length,
          completedCount: progress.filter(p => p.completed).length,
        };

        lookup.verdict = {
          userExists: true,
          effectiveStatus: status,
          canAccessCurriculum: true,
          canAccessPremiumContent: status === 'paid',
        };
      } else {
        lookup.database = { found: false };
        lookup.verdict = {
          userExists: false,
          effectiveStatus: 'not_found',
          canAccessCurriculum: false,
          canAccessPremiumContent: false,
        };
      }

      return NextResponse.json(lookup);
    }

    // ── General stats ──
    const results: Record<string, unknown> = {};

    const [subjects, courses] = await Promise.all([
      buildCurriculumHierarchyFromDb(),
      fetchSpecialCoursesFromDb(),
    ]);

    results.curriculum = {
      subjects: subjects.length,
      topics: subjects.reduce((sum, s) => sum + s.totalTopics, 0),
      specialCourses: courses.length,
    };

    results.subjects = subjects.map(s => ({
      id: s.id, name: s.name, grade: s.grade, board: s.board,
      totalTopics: s.totalTopics, groupEligibility: s.groupEligibility,
    }));

    // Supabase user count
    if (isSupabaseConfigured()) {
      try {
        const sb = getSupabase();
        const { count } = await sb
          .from('users')
          .select('*', { count: 'exact', head: true });
        results.userCount = count || 0;
      } catch {
        results.userCount = 'error';
      }
    } else {
      results.userCount = 'supabase_not_configured';
    }

    results.userSource = 'supabase';
    results.timestamp = new Date().toISOString();
    return NextResponse.json(results);
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
