/**
 * User Service — Prisma/SQLite-based user & progress operations
 *
 * Replaces all Supabase user operations with Prisma equivalents.
 * Google Sheets is used ONLY for curriculum data (via @/lib/sheet-sync).
 *
 * Key design decisions:
 * - Status values in the DB may be "true"/"false" (from migration) or "paid"/"free"
 *   → normalizeStatus() handles all variants
 * - Return types match the SheetUserCompat interface for API compatibility
 */

import { db } from '@/lib/db';
import { fetchUsersFromSheet, type SheetUser } from '@/lib/sheet-sync';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export interface SheetUserCompat {
  name: string;
  phone: string;
  grade: number;
  board: string;
  field: string;
  status: string;
  startDate: string;
  targetDate: string;
  currentDay: number;
  totalDays: number;
  pacingGoal: string;
  topicsDone: number;
  daysLeft: number;
  academicGroup: string;
  topicsPerDay: number;
  pin: string;
}

export interface ProgressRecord {
  phone: string;
  topicId: string;
  completed: boolean;
  dateCompleted: string;
}

// ═══════════════════════════════════════════════
// Status Normalization
// ═══════════════════════════════════════════════

/**
 * Normalize status values from various formats to a canonical form.
 * Handles: "true", "TRUE", "Paid", "paid" → "paid"
 *          "false", "FALSE", "Free", "free" → "free"
 *          "blocked", "disabled" → kept as-is
 */
export function normalizeStatus(status: string): 'paid' | 'free' | 'blocked' {
  if (!status) return 'free';
  const s = status.toLowerCase().trim();
  if (s === 'true' || s === 'paid') return 'paid';
  if (s === 'false' || s === 'free') return 'free';
  if (s === 'blocked' || s === 'disabled') return 'blocked';
  // Default to free for unknown values
  return 'free';
}

// ═══════════════════════════════════════════════
// User Operations
// ═══════════════════════════════════════════════

/**
 * Find a user by phone number in SQLite, return with normalized status.
 */
export async function findUserByPhone(phone: string): Promise<SheetUserCompat | null> {
  const student = await db.student.findUnique({
    where: { phone: phone.trim() },
  });

  if (!student) return null;

  return {
    name: student.name,
    phone: student.phone,
    grade: student.grade,
    board: student.board,
    field: student.field,
    status: normalizeStatus(student.status),
    startDate: student.startDate.toISOString().split('T')[0],
    targetDate: student.targetDate.toISOString().split('T')[0],
    currentDay: student.currentDay,
    totalDays: student.totalDays,
    pacingGoal: student.pacingGoal,
    topicsDone: student.topicsDone,
    daysLeft: student.daysLeft,
    academicGroup: student.academicGroup,
    topicsPerDay: student.topicsPerDay,
    pin: student.pin,
  };
}

/**
 * Register a new user in SQLite.
 * Returns the created user or an error message.
 */
export async function registerUser(input: {
  name: string;
  phone: string;
  pin: string;
  grade: number;
  board: string;
  field: string;
  academicGroup: string;
}): Promise<{ success: boolean; user?: SheetUserCompat; error?: string }> {
  const cleanPhone = input.phone.trim();
  const cleanPin = input.pin.trim();
  const cleanName = input.name.trim();

  // Validate
  if (!cleanName || cleanName.length < 2) {
    return { success: false, error: 'Name must be at least 2 characters.' };
  }
  if (cleanName.length > 40) {
    return { success: false, error: 'Name must be 40 characters or less.' };
  }
  if (!/^\d{11}$/.test(cleanPhone)) {
    return { success: false, error: 'Phone number must be exactly 11 digits.' };
  }
  if (!/^\d{4,6}$/.test(cleanPin)) {
    return { success: false, error: 'PIN must be 4-6 digits.' };
  }

  // Check for duplicate
  const existing = await db.student.findUnique({
    where: { phone: cleanPhone },
  });

  if (existing) {
    return { success: false, error: 'This phone number is already registered. Please sign in instead.' };
  }

  // Calculate defaults
  const now = new Date();
  const totalDays = 438;
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + totalDays);

  const topicsPerDayMap: Record<string, number> = { '3M': 6, '5M': 4, '6M': 3 };
  const defaultPacing = '5M';
  const topicsPerDay = topicsPerDayMap[defaultPacing] || 4;

  try {
    const student = await db.student.create({
      data: {
        name: cleanName,
        phone: cleanPhone,
        pin: cleanPin,
        grade: input.grade,
        board: input.board,
        field: input.field,
        status: 'free',
        academicGroup: input.academicGroup,
        startDate: now,
        targetDate,
        currentDay: 1,
        totalDays,
        pacingGoal: defaultPacing,
        topicsDone: 0,
        daysLeft: totalDays,
        topicsPerDay,
      },
    });

    console.log(`✅ User "${cleanName}" registered in SQLite`);

    return {
      success: true,
      user: {
        name: student.name,
        phone: student.phone,
        grade: student.grade,
        board: student.board,
        field: student.field,
        status: normalizeStatus(student.status),
        startDate: student.startDate.toISOString().split('T')[0],
        targetDate: student.targetDate.toISOString().split('T')[0],
        currentDay: student.currentDay,
        totalDays: student.totalDays,
        pacingGoal: student.pacingGoal,
        topicsDone: student.topicsDone,
        daysLeft: student.daysLeft,
        academicGroup: student.academicGroup,
        topicsPerDay: student.topicsPerDay,
        pin: student.pin,
      },
    };
  } catch (error: unknown) {
    console.error('❌ Registration error:', error);
    // Handle unique constraint violation
    const prismaError = error as { code?: string };
    if (prismaError.code === 'P2002') {
      return { success: false, error: 'This phone number is already registered. Please sign in instead.' };
    }
    return { success: false, error: `Registration failed: ${error instanceof Error ? error.message : String(error)}` };
  }
}

/**
 * Update a user's data in SQLite
 */
export async function updateUser(
  phone: string,
  updates: Partial<Omit<SheetUserCompat, 'phone'>>
): Promise<boolean> {
  try {
    // Map from SheetUserCompat field names to Prisma field names
    const prismaUpdates: Record<string, unknown> = {};

    if (updates.name !== undefined) prismaUpdates.name = updates.name;
    if (updates.grade !== undefined) prismaUpdates.grade = updates.grade;
    if (updates.board !== undefined) prismaUpdates.board = updates.board;
    if (updates.field !== undefined) prismaUpdates.field = updates.field;
    if (updates.status !== undefined) prismaUpdates.status = updates.status;
    if (updates.currentDay !== undefined) prismaUpdates.currentDay = updates.currentDay;
    if (updates.totalDays !== undefined) prismaUpdates.totalDays = updates.totalDays;
    if (updates.pacingGoal !== undefined) prismaUpdates.pacingGoal = updates.pacingGoal;
    if (updates.topicsDone !== undefined) prismaUpdates.topicsDone = updates.topicsDone;
    if (updates.daysLeft !== undefined) prismaUpdates.daysLeft = updates.daysLeft;
    if (updates.academicGroup !== undefined) prismaUpdates.academicGroup = updates.academicGroup;
    if (updates.topicsPerDay !== undefined) prismaUpdates.topicsPerDay = updates.topicsPerDay;
    if (updates.pin !== undefined) prismaUpdates.pin = updates.pin;
    if (updates.startDate !== undefined) prismaUpdates.startDate = new Date(updates.startDate);
    if (updates.targetDate !== undefined) prismaUpdates.targetDate = new Date(updates.targetDate);

    if (Object.keys(prismaUpdates).length === 0) return true;

    await db.student.update({
      where: { phone: phone.trim() },
      data: prismaUpdates,
    });

    return true;
  } catch (error) {
    console.error('❌ Update user error:', error);
    return false;
  }
}

// ═══════════════════════════════════════════════
// Progress Operations
// ═══════════════════════════════════════════════

/**
 * Get all progress records for a user
 */
export async function getUserProgress(phone: string): Promise<ProgressRecord[]> {
  const progress = await db.progress.findMany({
    where: { studentPhone: phone.trim() },
  });

  return progress.map(p => ({
    phone: p.studentPhone,
    topicId: p.topicId,
    completed: p.completed,
    dateCompleted: p.dateCompleted?.toISOString() || '',
  }));
}

/**
 * Toggle a single topic's completion status
 */
export async function toggleTopicProgress(
  phone: string,
  topicId: string,
  completed: boolean
): Promise<boolean> {
  try {
    const existing = await db.progress.findUnique({
      where: {
        topicId_studentPhone: {
          topicId,
          studentPhone: phone.trim(),
        },
      },
    });

    if (existing) {
      await db.progress.update({
        where: { id: existing.id },
        data: {
          completed,
          dateCompleted: completed ? new Date() : null,
        },
      });
    } else {
      await db.progress.create({
        data: {
          topicId,
          studentPhone: phone.trim(),
          completed,
          dateCompleted: completed ? new Date() : null,
        },
      });
    }

    // Update user's topicsDone count
    const completedCount = await db.progress.count({
      where: {
        studentPhone: phone.trim(),
        completed: true,
      },
    });

    await db.student.update({
      where: { phone: phone.trim() },
      data: { topicsDone: completedCount },
    });

    return true;
  } catch (error) {
    console.error('❌ Toggle progress error:', error);
    return false;
  }
}

/**
 * Sync progress records for a user — upserts each record.
 */
export async function syncProgress(
  phone: string,
  records: Array<{ topicId: string; completed: boolean; dateCompleted: string }>
): Promise<{ synced: number; merged: number }> {
  let merged = 0;

  for (const record of records) {
    if (!record.topicId) continue;

    try {
      const existing = await db.progress.findUnique({
        where: {
          topicId_studentPhone: {
            topicId: record.topicId,
            studentPhone: phone.trim(),
          },
        },
      });

      if (existing) {
        // Update only if the new completion is more recent
        const isNewer = record.dateCompleted &&
          new Date(record.dateCompleted) > (existing.dateCompleted || new Date(0));

        if (isNewer || record.completed) {
          await db.progress.update({
            where: { id: existing.id },
            data: {
              completed: record.completed,
              dateCompleted: record.dateCompleted ? new Date(record.dateCompleted) : (record.completed ? new Date() : null),
            },
          });
        }
        merged++;
      } else {
        await db.progress.create({
          data: {
            topicId: record.topicId,
            studentPhone: phone.trim(),
            completed: record.completed,
            dateCompleted: record.dateCompleted ? new Date(record.dateCompleted) : (record.completed ? new Date() : null),
          },
        });
        merged++;
      }
    } catch (error) {
      console.error(`❌ Progress sync error for topic ${record.topicId}:`, error);
    }
  }

  // Update user's topicsDone count
  const completedCount = await db.progress.count({
    where: {
      studentPhone: phone.trim(),
      completed: true,
    },
  });

  await db.student.update({
    where: { phone: phone.trim() },
    data: { topicsDone: completedCount },
  });

  console.log(`✅ Synced ${merged} progress records for ${phone} (${completedCount} total completed)`);
  return { synced: records.length, merged };
}

// ═══════════════════════════════════════════════
// Migration Operations
// ═══════════════════════════════════════════════

/**
 * Migrate existing users from Google Sheets → SQLite.
 * Skips users that already exist in the database.
 */
export async function migrateUsersFromSheets(): Promise<{ migrated: number; errors: number; skipped: number }> {
  const sheetUsers = await fetchUsersFromSheet(true);

  let migrated = 0;
  let errors = 0;
  let skipped = 0;

  /** Sanitize date values — handle empty strings, #REF!, and other bad data */
  function sanitizeDate(value: string | undefined): Date {
    if (!value || value.trim() === '' || value.includes('#REF!') || value.includes('#VALUE!')) {
      return new Date(); // default to now
    }
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      return new Date(); // default to now
    }
    return d;
  }

  for (const su of sheetUsers) {
    // Check if already exists
    const existing = await db.student.findUnique({
      where: { phone: su.phone },
    });

    if (existing) {
      skipped++;
      continue; // Skip — already migrated
    }

    try {
      await db.student.create({
        data: {
          name: su.name,
          phone: su.phone,
          pin: su.pin || '1234',
          grade: su.grade,
          board: su.board,
          field: su.field,
          status: normalizeStatus(su.status),
          academicGroup: su.academicGroup,
          startDate: sanitizeDate(su.startDate),
          targetDate: sanitizeDate(su.targetDate),
          currentDay: su.currentDay,
          totalDays: su.totalDays,
          pacingGoal: su.pacingGoal || '5M',
          topicsDone: su.topicsDone,
          daysLeft: su.daysLeft,
          topicsPerDay: su.topicsPerDay,
        },
      });
      migrated++;
    } catch (error) {
      console.error(`❌ Migration error for ${su.phone}:`, error);
      errors++;
    }
  }

  console.log(`✅ Migrated ${migrated} users from Sheets to SQLite (${errors} errors, ${skipped} skipped)`);
  return { migrated, errors, skipped };
}

// ═══════════════════════════════════════════════
// Utility: Get total user count
// ═══════════════════════════════════════════════

export async function getUserCount(): Promise<number> {
  return db.student.count();
}

/**
 * Get all users (for admin/debug purposes)
 */
export async function getAllUsers(): Promise<Array<SheetUserCompat & { createdAt?: string }>> {
  const students = await db.student.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return students.map(s => ({
    name: s.name,
    phone: s.phone,
    grade: s.grade,
    board: s.board,
    field: s.field,
    status: normalizeStatus(s.status),
    startDate: s.startDate.toISOString().split('T')[0],
    targetDate: s.targetDate.toISOString().split('T')[0],
    currentDay: s.currentDay,
    totalDays: s.totalDays,
    pacingGoal: s.pacingGoal,
    topicsDone: s.topicsDone,
    daysLeft: s.daysLeft,
    academicGroup: s.academicGroup,
    topicsPerDay: s.topicsPerDay,
    pin: s.pin,
    createdAt: s.createdAt.toISOString(),
  }));
}
