import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { findUserByPhone } from '@/lib/sheet-sync';

/**
 * Custom login API endpoint
 * 
 * Authentication strategy:
 * 1. Check local database first (fast, no network dependency)
 * 2. If not found, try live Google Sheet (slower but catches new users)
 * 3. If found in sheet, sync to local DB for future fast lookups
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

    // Step 1: Check local database first (fast)
    let student = await db.student.findUnique({ where: { phone: cleanPhone } });

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

    // Step 2: Not in local DB, try live Google Sheet
    console.log(`🔐 Login API: Not in local DB, trying Google Sheet...`);
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

/**
 * Background sync: Update local DB from Google Sheet
 * Runs non-blocking after a successful local DB login
 */
async function syncUserFromSheet(phone: string) {
  try {
    const sheetUser = await findUserByPhone(phone, false); // Use cache
    if (sheetUser) {
      await db.student.update({
        where: { phone },
        data: {
          name: sheetUser.name,
          grade: sheetUser.grade,
          board: sheetUser.board,
          field: sheetUser.field,
          status: sheetUser.status,
          currentDay: sheetUser.currentDay,
          totalDays: sheetUser.totalDays,
          topicsDone: sheetUser.topicsDone,
          daysLeft: sheetUser.daysLeft,
          academicGroup: sheetUser.academicGroup,
        },
      });
      console.log(`🔐 Background sync: Updated user "${sheetUser.name}" from sheet`);
    }
  } catch {
    // Silent - background sync failure is not critical
  }
}
