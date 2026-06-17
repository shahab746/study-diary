/**
 * Database Client — Prisma + SQLite
 *
 * Single source of truth for Users & Progress data.
 * Curriculum data still comes from Google Sheets (read-only via CSV).
 *
 * Previously used Supabase, now uses local SQLite for reliability
 * and zero-configuration setup.
 */

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = db;
}

export default db;
