import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * Custom login API endpoint
 * 
 * Authentication strategy:
 * 1. Check local database first (fast, no network dependency)
 * 2. If not found, dynamically import sheet-sync and try live Google Sheet
 * 3. If found in sheet, sync to local DB for future fast lookups
 * 
 * NOTE: findUserByPhone is dynamically imported to avoid loading the
 * sheet-sync module (and triggering Google Sheets network calls) when
 * the user already exists in the local DB.
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
    const student = await db.student.findUnique({ where: { phone: cleanPhone } });

    if (student) {
      // Found in local DB - verify PIN
      if (student.pin !== cleanPin) {
        console.warn(`🔐 Login API: Wrong PIN for phone="${cleanPhone}" (local DB)`);
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

      console.log(`🔐 Login API: Success for "${student.name}" via local DB (${student.status})`);

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
    }

    // Step 2: Not in local DB — dynamically load sheet-sync and try Google Sheet
    // This only runs for NEW users not yet synced to local DB
    console.log(`🔐 Login API: Not in local DB, trying Google Sheet...`);
    const { findUserByPhone } = await import('@/lib/sheet-sync');
    const sheetUser = await findUserByPhone(cleanPhone, true);

    if (!sheetUser) {
      console.warn(`🔐 Login API: No user found for phone="${cleanPhone}"`);
      return NextResponse.json(
        { success: false, error: 'No account found with this phone number. Make sure your phone number is in the sheet.' },
        { status: 401 }
      );
    }

    if (sheetUser.pin !== cleanPin) {
      console.warn(`🔐 Login API: Wrong PIN for phone="${cleanPhone}" (sheet)`);
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

    console.log(`🔐 Login API: Success for "${sheetUser.name}" via Google Sheet (${sheetUser.status})`);

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
      console.warn('🔐 Login API: Failed to save to local DB:', dbError);
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
    return NextResponse.json(
      { success: false, error: 'Unable to connect. Please try again in a moment.' },
      { status: 500 }
    );
  }
}
