import { NextResponse } from 'next/server';
import {
  buildCurriculumHierarchy,
  fetchSpecialCoursesFromSheet,
} from '@/lib/sheet-sync';
import {
  findUserByPhone,
  dbUserToSheetUser,
  isSupabaseConfigured,
  getUserProgress,
} from '@/lib/supabase';

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

    // ── Phone-based user lookup (Supabase only) ──
    if (phone) {
      const cleanPhone = phone.trim();
      const lookup: Record<string, any> = { phone: cleanPhone };

      if (!isSupabaseConfigured()) {
        lookup.supabase = { configured: false };
        lookup.verdict = { userExists: false, effectiveStatus: 'unknown', error: 'Supabase not configured' };
        return NextResponse.json(lookup);
      }

      const dbUser = await findUserByPhone(cleanPhone);
      if (dbUser) {
        const su = dbUserToSheetUser(dbUser);
        const status = normalizeStatus(su.status);
        const progress = await getUserProgress(cleanPhone);

        lookup.supabase = {
          found: true,
          name: dbUser.name,
          status: dbUser.status,
          normalizedStatus: status,
          grade: dbUser.grade,
          board: dbUser.board,
          academic_group: dbUser.academic_group,
          pin: dbUser.pin,
          topics_done: dbUser.topics_done,
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
        lookup.supabase = { found: false };
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
    const results: Record<string, any> = {};

    const [subjects, courses] = await Promise.all([
      buildCurriculumHierarchy(),
      fetchSpecialCoursesFromSheet(),
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

    // User count from Supabase
    if (isSupabaseConfigured()) {
      const { getSupabase } = await import('@/lib/supabase');
      const sb = getSupabase();
      const { count } = await sb.from('users').select('*', { count: 'exact', head: true });
      results.userCount = count || 0;
      results.userSource = 'supabase';
    } else {
      results.userCount = 0;
      results.userSource = 'not_configured';
    }

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
