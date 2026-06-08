import { NextResponse } from 'next/server';
import { registerUser } from '@/lib/registered-users';

/**
 * Registration API endpoint
 *
 * POST /api/register
 * Body: { name, phone, pin, grade, board, field, academicGroup }
 *
 * Flow:
 * 1. Validate input
 * 2. Check for duplicate phone in Google Sheets + server cache
 * 3. Save to server cache
 * 4. Attempt to write to Google Sheet via Apps Script (if configured)
 * 5. Return success + user data
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

    const result = await registerUser({
      name: String(name || '').trim(),
      phone: String(phone || '').trim(),
      pin: String(pin || '').trim(),
      grade: Number(grade) || 10,
      board: String(board || 'BISE Abbottabad').trim(),
      field: String(field || 'Science').trim(),
      academicGroup: String(academicGroup || 'Pre-Medical').trim(),
    });

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
        academicGroup: result.user!.academicGroup,
        syncedToSheet: result.user!.syncedToSheet,
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
 * GET /api/register — list registered users in server cache (debug/admin)
 */
export async function GET() {
  const { getRegisteredUsers, getRegisteredUserCount } = await import('@/lib/registered-users');
  const users = getRegisteredUsers();
  const count = getRegisteredUserCount();

  return NextResponse.json({
    count,
    users: users.map(u => ({
      name: u.name,
      phone: u.phone,
      grade: u.grade,
      board: u.board,
      field: u.field,
      academicGroup: u.academicGroup,
      registeredAt: u.registeredAt,
      syncedToSheet: u.syncedToSheet,
    })),
  });
}
