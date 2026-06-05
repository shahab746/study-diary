/**
 * CRITICAL: This module MUST be imported before any Prisma imports.
 *
 * When using the Turso driver adapter on Vercel, DATABASE_URL is not used
 * for actual queries (the adapter handles that). But Prisma's generated
 * client validates DATABASE_URL at module load time, and crashes if it's
 * undefined with: "URL_INVALID: The URL 'undefined' is not in a valid format"
 *
 * This module sets a safe default so Prisma can initialize without error.
 * It runs synchronously at import time, before Prisma's module body executes.
 */
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./dummy.db';
}
