import { NextResponse } from 'next/server';
import { findUserByPhone, normalizeStatus } from '@/lib/user-service';

/**
 * Login API — Prisma/SQLite
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

    const user = await findUserByPhone(cleanPhone);

    if (!user) {
      console.warn(`🔐 Login API: No user found for phone="${cleanPhone}"`);
      return NextResponse.json(
        { success: false, error: 'No account found with this phone number. Please register first.' },
        { status: 401 }
      );
    }

    if (user.pin !== cleanPin) {
      console.warn(`🔐 Login API: Wrong PIN for phone="${cleanPhone}"`);
      return NextResponse.json(
        { success: false, error: 'Incorrect PIN. Please try again.' },
        { status: 401 }
      );
    }

    const status = normalizeStatus(user.status);
    if (status === 'blocked') {
      return NextResponse.json(
        { success: false, error: 'Your account has been disabled. Please contact support.' },
        { status: 403 }
      );
    }

    console.log(`🔐 Login API: Success for "${user.name}" (${status})`);

    return NextResponse.json({
      success: true,
      user: {
        name: user.name,
        phone: user.phone,
        grade: user.grade,
        board: user.board,
        field: user.field,
        status,
        academicGroup: user.academicGroup,
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
