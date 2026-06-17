/**
 * Database module — Supabase only (no Prisma)
 *
 * This file is kept for backward compatibility but is no longer used.
 * All database operations now go through Supabase via @/lib/supabase
 * and curriculum data comes from Google Sheets via @/lib/sheet-sync.
 */

// Prisma has been removed. Use Supabase for user/progress data.
// Use sheet-sync for curriculum data.
export {};
