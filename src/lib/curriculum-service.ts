/**
 * Curriculum Service — Google Sheets-based curriculum hierarchy builder
 *
 * Replaces the Prisma/SQLite-based curriculum reads.
 * Uses Google Sheets (via sheet-sync.ts) for curriculum data
 * since curriculum data lives in the Google Sheet (read-only).
 *
 * Architecture:
 * - Users & Progress → Supabase
 * - Curriculum (subjects, chapters, topics) → Google Sheets
 */

import {
  buildCurriculumHierarchy,
  fetchSpecialCoursesFromSheet,
} from '@/lib/sheet-sync';
import type { BuiltSubject } from '@/lib/sheet-sync';

// Re-export the types so existing imports work
export type { BuiltSubject, BuiltChapter, BuiltTopic } from '@/lib/sheet-sync';

/**
 * Build curriculum hierarchy from Google Sheets.
 * This replaces the old buildCurriculumHierarchyFromDb() which used Prisma.
 */
export async function buildCurriculumHierarchyFromDb(forceRefresh = false): Promise<BuiltSubject[]> {
  return buildCurriculumHierarchy(forceRefresh);
}

/**
 * Fetch special courses from Google Sheets.
 * This replaces the old fetchSpecialCoursesFromDb() which used Prisma.
 */
export async function fetchSpecialCoursesFromDb(forceRefresh = false) {
  return fetchSpecialCoursesFromSheet(forceRefresh);
}
