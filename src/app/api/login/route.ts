import { NextResponse } from 'next/server';
import {
  findUserByPhone,
  dbUserToSheetUser,
  isSupabaseConfigured,
} from '@/lib/supabase';
import { findRegisteredUserByPhone } from '@/lib/registered-users';

// Normalize status from Google Sheet values — same logic as data route
function normalizeLoginStatus(status: string): string {
  if (!status) return 'free';
  const s = status.toLowerCase().trim();
  if (s === 'true' || s === 'paid') return 'paid';
  if (s === 'false' || s === 'free') return 'free';
  if (s === 'blocked' || s === 'disabled') return s;
  return s;
}

/**
 * Custom login API endpoint
 *
 * POST /api/login
 * Body: { phone: string, pin: string }
 *
 * Checks Supabase first, then falls back to Google Sheets + file store
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone, pin } = body;

    if (!phone || !pin) {
      return NextResponse.json(
        { success: false, error: 'Phone number and PIN are required' },
        { status: 400 }
      );
    }

    const cleanPhone = String(phone).trim();
    const cleanPin = String(pin).trim();

    console.log(`🔐 Login API: Looking up phone="${cleanPhone}"`);

    // ── Try Supabase first ──
    if (isSupabaseConfigured()) {
      const dbUser = await findUserByPhone(cleanPhone);

      if (dbUser) {
        if (dbUser.pin !== cleanPin) {
          console.warn(`🔐 Login API: Wrong PIN for phone="${cleanPhone}" (Supabase)`);
          return NextResponse.json(
            { success: false, error: 'Incorrect PIN. Please try again.' },
            { status: 401 }
          );
        }

        const normalizedStatus = normalizeLoginStatus(dbUser.status);
        if (normalizedStatus === 'blocked' || normalizedStatus === 'disabled') {
          return NextResponse.json(
            { success: false, error: 'Your account has been disabled. Please contact support.' },
            { status: 403 }
          );
        }

        // Cross-check with Google Sheets — if user is 'paid' in Sheets but 'free' in Supabase, upgrade
        let effectiveStatus = normalizedStatus;
        if (effectiveStatus === 'free') {
          try {
            const sheetCheck = await findRegisteredUserByPhone(cleanPhone, true);
            if (sheetCheck) {
              const sheetStatus = normalizeLoginStatus(sheetCheck.status);
              if (sheetStatus === 'paid') {
                effectiveStatus = 'paid';
                console.log(`🔐 Login API: Upgraded ${cleanPhone} to paid (found in Sheets/cache as paid)`);
                // Sync back to Supabase
                const { getSupabase } = await import('@/lib/supabase');
                getSupabase().from('users').update({ status: 'paid', updated_at: new Date().toISOString() }).eq('phone', cleanPhone).then(() => {
                  console.log(`✅ Synced paid status to Supabase for ${cleanPhone} during login`);
                }).catch(() => {});
              }
            }
          } catch { /* Sheets down — use Supabase status */ }
        }

        console.log(`🔐 Login API: Success for "${dbUser.name}" (${effectiveStatus}) [Supabase]`);
        return NextResponse.json({
          success: true,
          user: {
            name: dbUser.name,
            phone: dbUser.phone,
            grade: dbUser.grade,
            board: dbUser.board,
            field: dbUser.field,
            status: effectiveStatus,
            academicGroup: dbUser.academic_group,
          },
        });
      }
    }

    // ── Fallback: Google Sheets + registered-users cache ──
    const sheetUser = await findRegisteredUserByPhone(cleanPhone, true);

    if (!sheetUser) {
      console.warn(`🔐 Login API: No user found for phone="${cleanPhone}"`);
      return NextResponse.json(
        { success: false, error: 'No account found with this phone number. Please register first.' },
        { status: 401 }
      );
    }

    if (sheetUser.pin !== cleanPin) {
      console.warn(`🔐 Login API: Wrong PIN for phone="${cleanPhone}" (Sheets)`);
      return NextResponse.json(
        { success: false, error: 'Incorrect PIN. Please try again.' },
        { status: 401 }
      );
    }

    const normalizedStatus = normalizeLoginStatus(sheetUser.status);
    if (normalizedStatus === 'blocked' || normalizedStatus === 'disabled') {
      return NextResponse.json(
        { success: false, error: 'Your account has been disabled. Please contact support.' },
        { status: 403 }
      );
    }

    console.log(`🔐 Login API: Success for "${sheetUser.name}" (${normalizedStatus}) [Sheets fallback]`);

    // If user found in Sheets but not in Supabase, auto-migrate them
    if (isSupabaseConfigured()) {
      const { getSupabase } = await import('@/lib/supabase');
      const sb = getSupabase();
      // Sanitize dates for Sheets data with bad values
      const safeDate = (v: string | undefined) => {
        if (!v || v.trim() === '' || v.includes('#REF!') || v.includes('#VALUE!')) return new Date().toISOString().split('T')[0];
        const d = new Date(v);
        return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : v;
      };
      sb.from('users').insert({
        name: sheetUser.name,
        phone: sheetUser.phone,
        pin: sheetUser.pin || '1234',
        grade: sheetUser.grade,
        board: sheetUser.board,
        field: sheetUser.field,
        status: normalizeLoginStatus(sheetUser.status),
        academic_group: sheetUser.academicGroup,
        start_date: safeDate(sheetUser.startDate),
        target_date: safeDate(sheetUser.targetDate),
        current_day: sheetUser.currentDay,
        total_days: sheetUser.totalDays,
        pacing_goal: sheetUser.pacingGoal || '5M',
        topics_done: sheetUser.topicsDone,
        days_left: sheetUser.daysLeft,
        topics_per_day: sheetUser.topicsPerDay,
      }).then(() => {
        console.log(`✅ Auto-migrated user "${sheetUser.name}" to Supabase during login`);
      }).catch((err: any) => {
        // Duplicate key is fine — user already exists
        if (err?.code !== '23505') {
          console.warn('⚠️ Auto-migration failed (non-critical):', err.message);
        }
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        name: sheetUser.name,
        phone: sheetUser.phone,
        grade: sheetUser.grade,
        board: sheetUser.board,
        field: sheetUser.field,
        status: normalizedStatus,
        academicGroup: sheetUser.academicGroup,
      },
    });
  } catch (error) {
    console.error('🔐 Login API error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: `Connection error: ${message}` },
      { status: 500 }
    );
  }
}
