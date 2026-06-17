import { NextResponse } from 'next/server';
import {
  registerUserInSupabase,
  isSupabaseConfigured,
} from '@/lib/supabase';

/**
 * Registration API — Supabase only
 *
 * POST /api/register
 * Body: { name, phone, pin, grade, board, field, academicGroup, confirmPin }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, pin, grade, board, field, academicGroup, confirmPin } = body;

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

    if (!isSupabaseConfigured()) {
      console.error('Registration API: Supabase is not configured');
      return NextResponse.json(
        { success: false, error: 'Registration unavailable. Please try again later.' },
        { status: 503 }
      );
    }

    const result = await registerUserInSupabase(input);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    console.log(`🎉 Registration successful: "${result.user!.name}" (${result.user!.phone})`);

    return NextResponse.json({
      success: true,
      user: {
        name: result.user!.name,
        phone: result.user!.phone,
        grade: result.user!.grade,
        board: result.user!.board,
        field: result.user!.field,
        status: result.user!.status,
        academicGroup: result.user!.academic_group,
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
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ source: 'none', count: 0, users: [] });
  }

  const { getSupabase } = await import('@/lib/supabase');
  const sb = getSupabase();
  const { data, error } = await sb
    .from('users')
    .select('name, phone, grade, board, field, academic_group, status, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ source: 'supabase', error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    source: 'supabase',
    count: data?.length || 0,
    users: data?.map(u => ({
      name: u.name,
      phone: u.phone,
      grade: u.grade,
      board: u.board,
      field: u.field,
      academicGroup: u.academic_group,
      status: u.status,
      registeredAt: u.created_at,
    })),
  });
}
