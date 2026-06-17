import { NextResponse } from 'next/server';
import {
  registerUser,
  getAllUsers,
  normalizeStatus,
} from '@/lib/user-service';

/**
 * Registration API — Prisma/SQLite
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

    const result = await registerUser(input);

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
    const users = await getAllUsers();
    return NextResponse.json({
      source: 'prisma-sqlite',
      count: users.length,
      users: users.map(u => ({
        name: u.name,
        phone: u.phone,
        grade: u.grade,
        board: u.board,
        field: u.field,
        academicGroup: u.academicGroup,
        status: normalizeStatus(u.status),
        registeredAt: u.createdAt,
      })),
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { source: 'prisma-sqlite', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
