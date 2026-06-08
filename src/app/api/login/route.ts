import { NextResponse } from 'next/server';
import { findRegisteredUserByPhone } from '@/lib/registered-users';

/**
 * Custom login API endpoint
 * Reads user data from Google Sheets first, then from the registered-users server cache.
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

    // Look up user — checks Google Sheets first, then registered-users cache
    const sheetUser = await findRegisteredUserByPhone(cleanPhone, true);

    if (!sheetUser) {
      console.warn(`🔐 Login API: No user found for phone="${cleanPhone}"`);
      return NextResponse.json(
        { success: false, error: 'No account found with this phone number. Please register first.' },
        { status: 401 }
      );
    }

    if (sheetUser.pin !== cleanPin) {
      console.warn(`🔐 Login API: Wrong PIN for phone="${cleanPhone}"`);
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

    console.log(`🔐 Login API: Success for "${sheetUser.name}" (${sheetUser.status})`);

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
