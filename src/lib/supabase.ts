/**
 * Supabase Service — Single source of truth for Users & Progress
 *
 * Replaces:
 * - Google Sheets + Apps Script for user registration/writes
 * - File-based JSON store for registered users
 * - In-memory cache for progress sync
 *
 * Google Sheets remains the READ-ONLY source for Curriculum data
 * (it works perfectly for reads via CSV export).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export interface DbUser {
  id?: number;
  name: string;
  phone: string;
  pin: string;
  grade: number;
  board: string;
  field: string;
  status: string;        // 'free' | 'paid' | 'blocked'
  academic_group: string; // 'Pre-Medical' | 'Pre-Engineering' | 'ICS'
  start_date: string;
  target_date: string;
  current_day: number;
  total_days: number;
  pacing_goal: string;   // '3M' | '5M' | '6M'
  topics_done: number;
  days_left: number;
  topics_per_day: number;
  created_at?: string;
  updated_at?: string;
}

export interface DbProgress {
  id?: number;
  phone: string;
  topic_id: string;
  completed: boolean;
  date_completed: string | null;
  created_at?: string;
}

// ═══════════════════════════════════════════════
// Supabase Client (Server-side only)
// ═══════════════════════════════════════════════

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let _supabase: SupabaseClient | null = null;

/**
 * Get the Supabase client (singleton).
 * Uses the service role key for server-side operations (bypasses RLS).
 * Falls back to anon key if service key is not set.
 */
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.warn('⚠️ Supabase not configured — set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env');
    }
    const key = SUPABASE_SERVICE_KEY || SUPABASE_ANON_KEY;
    _supabase = createClient(SUPABASE_URL, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _supabase;
}

/** Check if Supabase is properly configured (not just placeholder values) */
export function isSupabaseConfigured(): boolean {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  // Reject placeholder values like "your-anon-key-here" or "YOUR_PROJECT_ID"
  if (SUPABASE_URL.includes('YOUR_PROJECT_ID') || SUPABASE_URL.includes('your_project_id')) return false;
  if (SUPABASE_ANON_KEY.includes('your-anon-key') || SUPABASE_ANON_KEY.length < 20) return false;
  // Must be a valid Supabase URL
  if (!SUPABASE_URL.includes('.supabase.co')) return false;
  return true;
}

// ═══════════════════════════════════════════════
// User Operations
// ═══════════════════════════════════════════════

/**
 * Register a new user in Supabase.
 * Returns the created user or an error message.
 */
export async function registerUserInSupabase(input: {
  name: string;
  phone: string;
  pin: string;
  grade: number;
  board: string;
  field: string;
  academicGroup: string;
}): Promise<{ success: boolean; user?: DbUser; error?: string }> {
  const sb = getSupabase();
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

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
  const { data: existing } = await sb
    .from('users')
    .select('phone')
    .eq('phone', cleanPhone)
    .maybeSingle();

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

  const user: Omit<DbUser, 'id' | 'created_at' | 'updated_at'> = {
    name: cleanName,
    phone: cleanPhone,
    pin: cleanPin,
    grade: input.grade,
    board: input.board,
    field: input.field,
    status: 'free',
    academic_group: input.academicGroup,
    start_date: now.toISOString().split('T')[0],
    target_date: targetDate.toISOString().split('T')[0],
    current_day: 1,
    total_days: totalDays,
    pacing_goal: defaultPacing,
    topics_done: 0,
    days_left: totalDays,
    topics_per_day: topicsPerDay,
  };

  const { data, error } = await sb
    .from('users')
    .insert(user)
    .select()
    .single();

  if (error) {
    console.error('❌ Supabase registration error:', error);
    // Handle unique constraint violation
    if (error.code === '23505') {
      return { success: false, error: 'This phone number is already registered. Please sign in instead.' };
    }
    return { success: false, error: `Registration failed: ${error.message}` };
  }

  console.log(`✅ User "${cleanName}" registered in Supabase`);
  return { success: true, user: data as DbUser };
}

/**
 * Find a user by phone number.
 * Checks Supabase first, then falls back to Google Sheets (for existing users).
 */
export async function findUserByPhone(phone: string): Promise<DbUser | null> {
  const sb = getSupabase();
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await sb
    .from('users')
    .select('*')
    .eq('phone', phone.trim())
    .maybeSingle();

  if (error) {
    console.error('❌ Supabase findUser error:', error);
    return null;
  }

  return data as DbUser | null;
}

/**
 * Update a user's data in Supabase
 */
export async function updateUserInSupabase(
  phone: string,
  updates: Partial<DbUser>
): Promise<boolean> {
  const sb = getSupabase();
  if (!isSupabaseConfigured()) return false;

  const { error } = await sb
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('phone', phone.trim());

  if (error) {
    console.error('❌ Supabase updateUser error:', error);
    return false;
  }
  return true;
}

// ═══════════════════════════════════════════════
// Progress Operations
// ═══════════════════════════════════════════════

/**
 * Get all progress records for a user
 */
export async function getUserProgress(phone: string): Promise<DbProgress[]> {
  const sb = getSupabase();
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await sb
    .from('progress')
    .select('*')
    .eq('phone', phone.trim());

  if (error) {
    console.error('❌ Supabase getProgress error:', error);
    return [];
  }

  return (data as DbProgress[]) || [];
}

/**
 * Sync progress records for a user — upserts each record.
 * This replaces the old in-memory cache + Google Sheets progress.
 */
export async function syncProgressToSupabase(
  phone: string,
  records: Array<{ topicId: string; completed: boolean; dateCompleted: string }>
): Promise<{ synced: number; merged: number }> {
  const sb = getSupabase();
  if (!isSupabaseConfigured()) return { synced: 0, merged: 0 };

  let merged = 0;

  for (const record of records) {
    if (!record.topicId) continue;

    // Check if this progress record already exists
    const { data: existing } = await sb
      .from('progress')
      .select('id, date_completed')
      .eq('phone', phone.trim())
      .eq('topic_id', record.topicId)
      .maybeSingle();

    if (existing) {
      // Update only if the new completion is more recent
      const isNewer = record.dateCompleted &&
        new Date(record.dateCompleted) > new Date(existing.date_completed || 0);

      if (isNewer || record.completed) {
        const { error } = await sb
          .from('progress')
          .update({
            completed: record.completed,
            date_completed: record.dateCompleted || new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (!error) merged++;
        else console.error('❌ Progress update error:', error);
      }
    } else {
      // Insert new progress record
      const { error } = await sb
        .from('progress')
        .insert({
          phone: phone.trim(),
          topic_id: record.topicId,
          completed: record.completed,
          date_completed: record.dateCompleted || new Date().toISOString(),
        });

      if (!error) merged++;
      else console.error('❌ Progress insert error:', error);
    }
  }

  // Update user's topics_done count
  const { count } = await sb
    .from('progress')
    .select('*', { count: 'exact', head: true })
    .eq('phone', phone.trim())
    .eq('completed', true);

  if (count !== null) {
    await sb
      .from('users')
      .update({ topics_done: count, updated_at: new Date().toISOString() })
      .eq('phone', phone.trim());
  }

  console.log(`✅ Synced ${merged} progress records for ${phone} (${count || 0} total completed)`);
  return { synced: records.length, merged };
}

/**
 * Toggle a single topic's completion status
 */
export async function toggleTopicProgress(
  phone: string,
  topicId: string,
  completed: boolean
): Promise<boolean> {
  const sb = getSupabase();
  if (!isSupabaseConfigured()) return false;

  const { data: existing } = await sb
    .from('progress')
    .select('id')
    .eq('phone', phone.trim())
    .eq('topic_id', topicId)
    .maybeSingle();

  if (existing) {
    const { error } = await sb
      .from('progress')
      .update({
        completed,
        date_completed: completed ? new Date().toISOString() : null,
      })
      .eq('id', existing.id);

    if (error) {
      console.error('❌ Toggle progress error:', error);
      return false;
    }
  } else {
    const { error } = await sb
      .from('progress')
      .insert({
        phone: phone.trim(),
        topic_id: topicId,
        completed,
        date_completed: completed ? new Date().toISOString() : null,
      });

    if (error) {
      console.error('❌ Insert progress error:', error);
      return false;
    }
  }

  // Update user's topics_done count
  const { count } = await sb
    .from('progress')
    .select('*', { count: 'exact', head: true })
    .eq('phone', phone.trim())
    .eq('completed', true);

  if (count !== null) {
    await sb
      .from('users')
      .update({ topics_done: count, updated_at: new Date().toISOString() })
      .eq('phone', phone.trim());
  }

  return true;
}

// ═══════════════════════════════════════════════
// Convert Supabase user → SheetUser format
// (for compatibility with existing code)
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

export function dbUserToSheetUser(user: DbUser): SheetUserCompat {
  return {
    name: user.name,
    phone: user.phone,
    grade: user.grade,
    board: user.board,
    field: user.field,
    status: user.status,
    startDate: user.start_date,
    targetDate: user.target_date,
    currentDay: user.current_day,
    totalDays: user.total_days,
    pacingGoal: user.pacing_goal,
    topicsDone: user.topics_done,
    daysLeft: user.days_left,
    academicGroup: user.academic_group,
    topicsPerDay: user.topics_per_day,
    pin: user.pin,
  };
}

/**
 * Migrate existing users from Google Sheets → Supabase
 * Call this once from the /api/migrate endpoint
 */
export async function migrateSheetsToSupabase(): Promise<{ migrated: number; errors: number }> {
  const sb = getSupabase();
  if (!isSupabaseConfigured()) return { migrated: 0, errors: 0 };

  const { fetchUsersFromSheet } = await import('./sheet-sync');
  const sheetUsers = await fetchUsersFromSheet(true);

  let migrated = 0;
  let errors = 0;

  /** Sanitize date values — handle empty strings, #REF!, and other bad data */
  function sanitizeDate(value: string | undefined): string {
    if (!value || value.trim() === '' || value.includes('#REF!') || value.includes('#VALUE!')) {
      return new Date().toISOString().split('T')[0]; // default to today
    }
    // Check if it's a valid date
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      return new Date().toISOString().split('T')[0]; // default to today
    }
    return value;
  }

  for (const su of sheetUsers) {
    // Check if already exists
    const { data: existing } = await sb
      .from('users')
      .select('phone')
      .eq('phone', su.phone)
      .maybeSingle();

    if (existing) continue; // Skip — already migrated

    const { error } = await sb.from('users').insert({
      name: su.name,
      phone: su.phone,
      pin: su.pin || '1234', // default PIN if missing
      grade: su.grade,
      board: su.board,
      field: su.field,
      status: su.status === 'true' ? 'paid' : su.status === 'false' ? 'free' : su.status,
      academic_group: su.academicGroup,
      start_date: sanitizeDate(su.startDate),
      target_date: sanitizeDate(su.targetDate),
      current_day: su.currentDay,
      total_days: su.totalDays,
      pacing_goal: su.pacingGoal || '5M',
      topics_done: su.topicsDone,
      days_left: su.daysLeft,
      topics_per_day: su.topicsPerDay,
    });

    if (error) {
      console.error(`❌ Migration error for ${su.phone}:`, error.message);
      errors++;
    } else {
      migrated++;
    }
  }

  console.log(`✅ Migrated ${migrated} users from Sheets to Supabase (${errors} errors)`);
  return { migrated, errors };
}
