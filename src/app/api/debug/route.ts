import { NextResponse } from 'next/server';
import {
  buildCurriculumHierarchy,
  fetchSpecialCoursesFromSheet,
} from '@/lib/sheet-sync';
import {
  findUserByPhone,
  getUserProgress,
  getUserCount,
  normalizeStatus,
} from '@/lib/user-service';

export const dynamic = 'force-dynamic';

/**
 * Debug endpoint — user lookup + stats.
 * GET /api/debug              → general stats
 * GET /api/debug?phone=03XXX  → detailed user lookup in Prisma/SQLite
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone');

    // ── Phone-based user lookup (Prisma/SQLite) ──
    if (phone) {
      const cleanPhone = phone.trim();
      const lookup: Record<string, unknown> = { phone: cleanPhone };

      const user = await findUserByPhone(cleanPhone);
      if (user) {
        const status = normalizeStatus(user.status);
        const progress = await getUserProgress(cleanPhone);

        lookup.database = {
          found: true,
          name: user.name,
          status: user.status,
          normalizedStatus: status,
          grade: user.grade,
          board: user.board,
          academicGroup: user.academicGroup,
          pin: user.pin,
          topicsDone: user.topicsDone,
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

    const [subjects, courses, userCount] = await Promise.all([
      buildCurriculumHierarchy(),
      fetchSpecialCoursesFromSheet(),
      getUserCount(),
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

    results.userCount = userCount;
    results.userSource = 'prisma-sqlite';
    results.timestamp = new Date().toISOString();
    return NextResponse.json(results);
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
