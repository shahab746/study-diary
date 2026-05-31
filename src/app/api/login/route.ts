import { NextResponse } from 'next/server';
import { findUserByPhone } from '@/lib/sheet-sync';

/**
 * Custom login API endpoint
 * 
 * This endpoint authenticates users directly against the live Google Sheet.
 * It bypasses NextAuth's CSRF mechanism which can cause issues in some browsers.
 * After successful validation, it triggers NextAuth's signIn from the client.
 * 
 * POST /api/login
 * Body: { phone: string, pin: string }
 * 
 * Returns: { success: true, user: {...} } or { success: false, error: string }
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

    // Fetch from live Google Sheet with forceRefresh to get latest data
    const sheetUser = await findUserByPhone(cleanPhone, true);

    if (!sheetUser) {
      console.warn(`🔐 Login API: No user found for phone="${cleanPhone}"`);
      return NextResponse.json(
        { success: false, error: 'No account found with this phone number. Make sure your phone number is in the sheet.' },
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

    if (sheetUser.status === 'blocked' || sheetUser.status === 'disabled') {
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
      },
    });
  } catch (error) {
    console.error('🔐 Login API error:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to connect. Please try again in a moment.' },
      { status: 500 }
    );
  }
}
