/**
 * Registered Users — File-based JSON store + Google Apps Script integration
 *
 * When a user registers via /api/register:
 *   1. Their data is saved to a JSON file on disk (instant, no DB needed)
 *   2. If GOOGLE_APPS_SCRIPT_URL is configured, also appended to Google Sheets (persistent)
 *   3. If the Script URL is NOT configured, the JSON file is the only source (dev mode)
 *
 * Login/auth checks: Google Sheets → This JSON file → Reject
 *
 * NOTE: Previously used an in-memory Map, but Next.js dev mode (Turbopack) isolates
 * module state across route handlers, so the Map was empty in /api/login and /api/auth
 * even though /api/register had populated it. File-based storage fixes this.
 */

import { findUserByPhone, type SheetUser, invalidateCache } from './sheet-sync';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export interface RegisteredUser {
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
  registeredAt: string; // ISO timestamp
  syncedToSheet: boolean; // whether Apps Script write succeeded
}

// ═══════════════════════════════════════════════
// File-Based JSON Store
// ═══════════════════════════════════════════════

const DATA_DIR = join(process.cwd(), '.data');
const USERS_FILE = join(DATA_DIR, 'registered-users.json');

/** Ensure the .data directory exists */
function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

/** Read all registered users from the JSON file */
function readUsersFromFile(): Map<string, RegisteredUser> {
  try {
    ensureDataDir();
    if (!existsSync(USERS_FILE)) {
      return new Map<string, RegisteredUser>();
    }
    const raw = readFileSync(USERS_FILE, 'utf-8');
    const arr: RegisteredUser[] = JSON.parse(raw);
    const map = new Map<string, RegisteredUser>();
    for (const u of arr) {
      map.set(u.phone, u);
    }
    return map;
  } catch {
    return new Map<string, RegisteredUser>();
  }
}

/** Write all registered users to the JSON file */
function writeUsersToFile(users: Map<string, RegisteredUser>): void {
  try {
    ensureDataDir();
    const arr = Array.from(users.values());
    writeFileSync(USERS_FILE, JSON.stringify(arr, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to write registered users file:', error);
  }
}

/**
 * In-memory cache that is loaded from / saved to the JSON file.
 * Always re-reads from file on lookup to avoid stale data across
 * Next.js route handler module isolation.
 */
function getUsers(): Map<string, RegisteredUser> {
  return readUsersFromFile();
}

function persistUsers(users: Map<string, RegisteredUser>): void {
  writeUsersToFile(users);
}

// ═══════════════════════════════════════════════
// Google Apps Script Integration
// ═══════════════════════════════════════════════

const APPS_SCRIPT_URL = process.env.GOOGLE_APPS_SCRIPT_URL || '';

/**
 * Append a new user row to the Google Sheet via Apps Script web app.
 * Returns true if the write succeeded.
 *
 * NOTE: Google Apps Script web apps return 302 redirects for POST requests.
 * Standard fetch() follows the redirect but converts POST→GET, losing the body.
 * We handle this by sending with redirect:'manual', capturing the redirect URL,
 * then following it with a GET (the script already received the POST data).
 */
async function appendUserToSheet(user: RegisteredUser): Promise<boolean> {
  if (!APPS_SCRIPT_URL) {
    console.log('📝 No GOOGLE_APPS_SCRIPT_URL configured — user saved to server cache only');
    return false;
  }

  try {
    const payload = JSON.stringify({
      name: user.name,
      phone: user.phone,
      grade: user.grade,
      board: user.board,
      field: user.field,
      status: user.status,
      is_paid: user.status === 'paid',  // Map status to is_paid for sheet compatibility
      startDate: user.startDate,
      targetDate: user.targetDate,
      currentDay: user.currentDay,
      totalDays: user.totalDays,
      pacingGoal: user.pacingGoal,
      topicsDone: user.topicsDone,
      daysLeft: user.daysLeft,
      academicGroup: user.academicGroup,
      topicsPerDay: user.topicsPerDay,
      pin: user.pin,
    });

    console.log(`📤 Sending registration to Apps Script: ${APPS_SCRIPT_URL.substring(0, 50)}...`);

    // Step 1: POST to the Apps Script URL without following redirects
    console.log(`📤 POST to Apps Script (payload size: ${payload.length} chars)`);
    const postRes = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: payload,
      redirect: 'manual',
    });
    console.log(`📥 Apps Script initial response: status=${postRes.status}, type=${postRes.type}`);

    // Google Apps Script returns 301/302 with the actual response URL
    if (postRes.status >= 300 && postRes.status < 400) {
      const redirectUrl = postRes.headers.get('location');
      console.log(`🔄 Apps Script redirect: ${postRes.status} → ${redirectUrl?.substring(0, 80)}...`);
      if (redirectUrl) {
        // Step 2: Follow the redirect to get the actual response
        const finalRes = await fetch(redirectUrl, {
          method: 'GET',
          redirect: 'follow',
        });
        console.log(`📥 Redirect response: status=${finalRes.status}`);

        if (finalRes.ok) {
          const text = await finalRes.text();
          try {
            const data = JSON.parse(text);
            if (data.success) {
              invalidateCache('sheet_users');
              console.log(`✅ User "${user.name}" written to Google Sheet via Apps Script`);
              return true;
            }
            console.warn('⚠️ Apps Script returned failure:', data);
            return false;
          } catch {
            // Response might not be JSON — if we got here, the script likely executed
            console.log(`✅ User "${user.name}" likely written to Google Sheet (non-JSON response)`);
            invalidateCache('sheet_users');
            return true;
          }
        }
      }
    }

    // Some deployments return the response directly (no redirect)
    if (postRes.ok) {
      try {
        const data = await postRes.json();
        if (data.success) {
          invalidateCache('sheet_users');
          console.log(`✅ User "${user.name}" written to Google Sheet via Apps Script`);
          return true;
        }
      } catch {
        // Non-JSON but 200 OK — likely success
        invalidateCache('sheet_users');
        return true;
      }
    }

    console.warn('⚠️ Apps Script write failed:', postRes.status);
    return false;
  } catch (error) {
    console.warn('⚠️ Apps Script write error:', error);
    return false;
  }
}

// ═══════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════

/**
 * Register a new user.
 * 1. Check Google Sheets for duplicate phone
 * 2. Check server cache for duplicate phone
 * 3. Save to server cache
 * 4. Attempt to write to Google Sheet via Apps Script
 * 5. Return the registered user
 */
export async function registerUser(input: {
  name: string;
  phone: string;
  pin: string;
  grade: number;
  board: string;
  field: string;
  academicGroup: string;
}): Promise<{ success: boolean; user?: RegisteredUser; error?: string }> {
  const cleanPhone = input.phone.trim();
  const cleanPin = input.pin.trim();
  const cleanName = input.name.trim();

  // ── Validate inputs ──
  if (!cleanName || cleanName.length < 2) {
    return { success: false, error: 'Name must be at least 2 characters.' };
  }
  if (cleanName.length > 40) {
    return { success: false, error: 'Name must be 40 characters or less.' };
  }
  if (!/^\d{11}$/.test(cleanPhone)) {
    return { success: false, error: 'Phone number must be exactly 11 digits (e.g., 03XXXXXXXXX).' };
  }
  if (!/^\d{4,6}$/.test(cleanPin)) {
    return { success: false, error: 'PIN must be 4-6 digits.' };
  }

  // ── Check for duplicate in Google Sheets ──
  try {
    const sheetUser = await findUserByPhone(cleanPhone, true);
    if (sheetUser) {
      return { success: false, error: 'This phone number is already registered. Please sign in instead.' };
    }
  } catch {
    // Sheets might be down — continue with cache check only
  }

  // ── Check for duplicate in local store ──
  const users = getUsers();
  if (users.has(cleanPhone)) {
    return { success: false, error: 'This phone number is already registered. Please sign in instead.' };
  }

  // ── Calculate default values ──
  const now = new Date();
  const totalDays = 438; // ~14.6 months
  const targetDate = new Date(now);
  targetDate.setDate(targetDate.getDate() + totalDays);

  const topicsPerDayMap: Record<string, number> = {
    '3M': 6,
    '5M': 4,
    '6M': 3,
  };
  // Default pacing based on academic group
  const defaultPacing = input.academicGroup === 'Pre-Engineering' || input.academicGroup === 'ICS' ? '5M' : '5M';
  const topicsPerDay = topicsPerDayMap[defaultPacing] || 4;

  const user: RegisteredUser = {
    name: cleanName,
    phone: cleanPhone,
    grade: input.grade,
    board: input.board,
    field: input.field,
    status: 'free',
    startDate: now.toISOString().split('T')[0],
    targetDate: targetDate.toISOString().split('T')[0],
    currentDay: 1,
    totalDays,
    pacingGoal: defaultPacing,
    topicsDone: 0,
    daysLeft: totalDays,
    academicGroup: input.academicGroup,
    topicsPerDay,
    pin: cleanPin,
    registeredAt: now.toISOString(),
    syncedToSheet: false,
  };

  // ── Save to local store ──
  users.set(cleanPhone, user);
  persistUsers(users);
  console.log(`📝 User "${cleanName}" (${cleanPhone}) registered — saved to local store`);

  // ── Attempt to write to Google Sheet ──
  const synced = await appendUserToSheet(user);
  if (synced) {
    user.syncedToSheet = true;
    const freshUsers = getUsers();
    freshUsers.set(cleanPhone, user); // update store with sync status
    persistUsers(freshUsers);
  }

  return { success: true, user };
}

/**
 * Find a user by phone — checks Google Sheets first, then server cache.
 * This is used by auth/login to find registered users.
 */
export async function findRegisteredUserByPhone(phone: string, forceRefresh = false): Promise<SheetUser | null> {
  // 1. Check Google Sheets (primary source)
  try {
    const sheetUser = await findUserByPhone(phone, forceRefresh);
    if (sheetUser) return sheetUser;
  } catch {
    // Sheets down — fall through to cache
  }

  // 2. Check local registered-users store (file-backed)
  const users = getUsers();
  const cached = users.get(phone);
  if (cached) {
    return {
      name: cached.name,
      phone: cached.phone,
      grade: cached.grade,
      board: cached.board,
      field: cached.field,
      status: cached.status,
      startDate: cached.startDate,
      targetDate: cached.targetDate,
      currentDay: cached.currentDay,
      totalDays: cached.totalDays,
      pacingGoal: cached.pacingGoal,
      topicsDone: cached.topicsDone,
      daysLeft: cached.daysLeft,
      academicGroup: cached.academicGroup,
      topicsPerDay: cached.topicsPerDay,
      pin: cached.pin,
    };
  }

  return null;
}

/**
 * Get all registered users in the server cache (for debugging/admin)
 */
export function getRegisteredUsers(): RegisteredUser[] {
  return Array.from(getUsers().values());
}

/**
 * Get the count of registered users in the local store
 */
export function getRegisteredUserCount(): number {
  return getUsers().size;
}
