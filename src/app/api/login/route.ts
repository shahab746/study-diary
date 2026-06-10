import { NextResponse } from 'next/server';
import {
  findUserByPhone,
  dbUserToSheetUser,
  isSupabaseConfigured,
} from '@/lib/supabase';
import { findRegisteredUserByPhone } from '@/lib/registered-users';

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

        const normalizedStatus = dbUser.status?.toLowerCase().trim();
        if (normalizedStatus === 'blocked' || normalizedStatus === 'disabled') {
          return NextResponse.json(
            { success: false, error: 'Your account has been disabled. Please contact support.' },
            { status: 403 }
          );
        }

        console.log(`🔐 Login API: Success for "${dbUser.name}" (${dbUser.status}) [Supabase]`);
        return NextResponse.json({
          success: true,
          user: {
            name: dbUser.name,
            phone: dbUser.phone,
            grade: dbUser.grade,
            board: dbUser.board,
            field: dbUser.field,
            status: dbUser.status,
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

    const normalizedStatus = sheetUser.status?.toLowerCase().trim();
    if (normalizedStatus === 'blocked' || normalizedStatus === 'disabled') {
      return NextResponse.json(
        { success: false, error: 'Your account has been disabled. Please contact support.' },
        { status: 403 }
      );
    }

    console.log(`🔐 Login API: Success for "${sheetUser.name}" (${sheetUser.status}) [Sheets fallback]`);

    // If user found in Sheets but not in Supabase, auto-migrate them
    if (isSupabaseConfigured()) {
      const { getSupabase } = await import('@/lib/supabase');
      const sb = getSupabase();
      await sb.from('users').insert({
        name: sheetUser.name,
        phone: sheetUser.phone,
        pin: sheetUser.pin,
        grade: sheetUser.grade,
        board: sheetUser.board,
        field: sheetUser.field,
        status: sheetUser.status === 'true' ? 'paid' : sheetUser.status === 'false' ? 'free' : sheetUser.status,
        academic_group: sheetUser.academicGroup,
        start_date: sheetUser.startDate || new Date().toISOString().split('T')[0],
        target_date: sheetUser.targetDate,
        current_day: sheetUser.currentDay,
        total_days: sheetUser.totalDays,
        pacing_goal: sheetUser.pacingGoal,
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
        status: sheetUser.status,
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
