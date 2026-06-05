/**
 * CRITICAL: This module MUST be imported before any Prisma imports.
 *
 * When using the Turso driver adapter on Vercel, DATABASE_URL is not used
 * for actual queries (the adapter handles that). But Prisma's native engine
 * validates DATABASE_URL at initialization time and crashes if it's undefined:
 * "URL_INVALID: The URL 'undefined' is not in a valid format"
 *
 * This module sets a safe default synchronously before Prisma loads.
 * It runs at module evaluation time, which is before any Prisma queries.
 */
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === 'undefined') {
  process.env.DATABASE_URL = 'file:./dummy.db';
}
