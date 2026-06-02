import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Custom login API endpoint
 * 
 * Authentication strategy:
 * 1. Check local database first (fast, no network dependency)
 * 2. If not found, dynamically import sheet-sync and try live Google Sheet
 * 3. If found in sheet, sync to local DB for future fast lookups
 * 4. Use NextAuth's signIn() on the client side after verification
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

    // Step 1: Check local database first (fast — no network calls)
    let student = await db.student.findUnique({ where: { phone: cleanPhone } });

    // Step 2: If not in local DB, try Google Sheet
    if (!student) {
      console.log(`🔐 Login API: Not in local DB, trying Google Sheet...`);
      try {
        const { findUserByPhone, invalidateCache } = await import('@/lib/sheet-sync');
        invalidateCache('sheet_users');
        const sheetUser = await findUserByPhone(cleanPhone, true);

        if (sheetUser) {
          // Save to local DB for future fast lookups
          try {
            await db.student.upsert({
              where: { phone: sheetUser.phone },
              create: {
                name: sheetUser.name,
                phone: sheetUser.phone,
                grade: sheetUser.grade,
                board: sheetUser.board,
                field: sheetUser.field,
                status: sheetUser.status,
                startDate: sheetUser.startDate ? new Date(sheetUser.startDate) : new Date(),
                targetDate: sheetUser.targetDate ? new Date(sheetUser.targetDate) : new Date(),
                currentDay: sheetUser.currentDay,
                totalDays: sheetUser.totalDays,
                topicsDone: sheetUser.topicsDone,
                daysLeft: sheetUser.daysLeft,
                pin: sheetUser.pin,
                academicGroup: sheetUser.academicGroup,
              },
              update: {
                name: sheetUser.name,
                grade: sheetUser.grade,
                board: sheetUser.board,
                field: sheetUser.field,
                status: sheetUser.status,
                currentDay: sheetUser.currentDay,
                totalDays: sheetUser.totalDays,
                topicsDone: sheetUser.topicsDone,
                daysLeft: sheetUser.daysLeft,
                pin: sheetUser.pin,
                academicGroup: sheetUser.academicGroup,
              },
            });
            console.log(`🔐 Login API: Saved user "${sheetUser.name}" to local DB`);
          } catch (dbError) {
            console.error('🔐 Login API: Failed to save to local DB:', dbError);
          }

          // Re-fetch from local DB to get the student record
          student = await db.student.findUnique({ where: { phone: cleanPhone } });
        }
      } catch (sheetError) {
        console.error('🔐 Login API: Google Sheet lookup failed:', sheetError);
        // Continue - we'll just report user not found
      }
    }

    if (!student) {
      console.warn(`🔐 Login API: No user found for phone="${cleanPhone}"`);
      return NextResponse.json(
        { success: false, error: 'No account found with this phone number. Make sure your phone number is in the sheet.' },
        { status: 401 }
      );
    }

    if (student.pin !== cleanPin) {
      console.warn(`🔐 Login API: Wrong PIN for phone="${cleanPhone}"`);
      return NextResponse.json(
        { success: false, error: 'Incorrect PIN. Please try again.' },
        { status: 401 }
      );
    }

    if (student.status === 'blocked' || student.status === 'disabled') {
      return NextResponse.json(
        { success: false, error: 'Your account has been disabled. Please contact support.' },
        { status: 403 }
      );
    }

    console.log(`🔐 Login API: Success for "${student.name}" (${student.status})`);

    // Return user data — the client will use NextAuth signIn() to create the session
    return NextResponse.json({
      success: true,
      user: {
        name: student.name,
        phone: student.phone,
        grade: student.grade,
        board: student.board,
        field: student.field,
        status: student.status,
        academicGroup: student.academicGroup,
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
