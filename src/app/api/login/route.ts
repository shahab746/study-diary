import { NextResponse } from 'next/server';
import {
  findUserByPhone,
  isSupabaseConfigured,
} from '@/lib/supabase';

/**
 * Login API — Supabase only
 *
 * POST /api/login
 * Body: { phone: string, pin: string }
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

    // ── Supabase is the single source of truth for Users ──
    if (!isSupabaseConfigured()) {
      console.error('🔐 Login API: Supabase is not configured');
      return NextResponse.json(
        { success: false, error: 'Service unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const dbUser = await findUserByPhone(cleanPhone);

    if (!dbUser) {
      console.warn(`🔐 Login API: No user found for phone="${cleanPhone}"`);
      return NextResponse.json(
        { success: false, error: 'No account found with this phone number. Please register first.' },
        { status: 401 }
      );
    }

    if (dbUser.pin !== cleanPin) {
      console.warn(`🔐 Login API: Wrong PIN for phone="${cleanPhone}"`);
      return NextResponse.json(
        { success: false, error: 'Incorrect PIN. Please try again.' },
        { status: 401 }
      );
    }

    const status = normalizeStatus(dbUser.status);
    if (status === 'blocked' || status === 'disabled') {
      return NextResponse.json(
        { success: false, error: 'Your account has been disabled. Please contact support.' },
        { status: 403 }
      );
    }

    console.log(`🔐 Login API: Success for "${dbUser.name}" (${status})`);

    return NextResponse.json({
      success: true,
      user: {
        name: dbUser.name,
        phone: dbUser.phone,
        grade: dbUser.grade,
        board: dbUser.board,
        field: dbUser.field,
        status,
        academicGroup: dbUser.academic_group,
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

function normalizeStatus(status: string): string {
  if (!status) return 'free';
  const s = status.toLowerCase().trim();
  if (s === 'true' || s === 'paid') return 'paid';
  if (s === 'false' || s === 'free') return 'free';
  if (s === 'blocked' || s === 'disabled') return s;
  return s;
}
