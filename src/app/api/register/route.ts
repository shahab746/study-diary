import { NextResponse } from 'next/server';
import {
  registerUserInSupabase,
  isSupabaseConfigured,
  getSupabase,
  findUserByPhone,
  dbUserToSheetUser,
} from '@/lib/supabase';

function normalizeStatus(status: string): string {
  if (!status) return 'free';
  const s = status.toLowerCase().trim();
  if (s === 'true' || s === 'paid') return 'paid';
  if (s === 'false' || s === 'free') return 'free';
  if (s === 'blocked' || s === 'disabled') return s;
  return s;
}

/**
 * Registration API — Supabase
 *
 * POST /api/register
 * Body: { name, phone, pin, grade, board, field, academicGroup, confirmPin }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, pin, grade, board, field, academicGroup, confirmPin } = body;

    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { success: false, error: 'Service unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    // Extra validation: confirm PIN match
    if (pin !== confirmPin) {
      return NextResponse.json(
        { success: false, error: 'PINs do not match. Please re-enter.' },
        { status: 400 }
      );
    }

    const input = {
      name: String(name || '').trim(),
      phone: String(phone || '').trim(),
      pin: String(pin || '').trim(),
      grade: Number(grade) || 10,
      board: String(board || 'BISE Abbottabad').trim(),
      field: String(field || 'Science').trim(),
      academicGroup: String(academicGroup || 'Pre-Medical').trim(),
    };

    const result = await registerUserInSupabase(input);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    const dbUser = result.user!;
    console.log(`🎉 Registration successful: "${dbUser.name}" (${dbUser.phone})`);

    return NextResponse.json({
      success: true,
      user: {
        name: dbUser.name,
        phone: dbUser.phone,
        grade: dbUser.grade,
        board: dbUser.board,
        field: dbUser.field,
        status: normalizeStatus(dbUser.status),
        academicGroup: dbUser.academic_group,
      },
    });
  } catch (error) {
    console.error('Registration API error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: `Registration failed: ${message}` },
      { status: 500 }
    );
  }
}

/**
 * GET /api/register — list registered users (debug/admin)
 */
export async function GET() {
  try {
    if (!isSupabaseConfigured()) {
      return NextResponse.json(
        { source: 'supabase', error: 'Supabase not configured' },
        { status: 503 }
      );
    }

    const sb = getSupabase();
    const { data, error } = await sb
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { source: 'supabase', error: error.message },
        { status: 500 }
      );
    }

    const users = (data || []).map((u: Record<string, unknown>) => ({
      name: u.name,
      phone: u.phone,
      grade: u.grade,
      board: u.board,
      field: u.field,
      academicGroup: u.academic_group,
      status: normalizeStatus(String(u.status || '')),
      registeredAt: u.created_at,
    }));

    return NextResponse.json({
      source: 'supabase',
      count: users.length,
      users,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { source: 'supabase', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
