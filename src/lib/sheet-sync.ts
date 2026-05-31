/**
 * Google Sheets Live Sync Service
 * 
 * Reads data directly from the live Google Sheet so that:
 * - Adding a user in the sheet enables instant login
 * - Status (free/paid), Board, Grade, etc. are always up-to-date
 * - Curriculum changes are reflected automatically
 * 
 * Two modes:
 * 1. Service Account (PRIVATE sheets) - Full read/write with Google Sheets API
 * 2. Public Export (PUBLIC sheets) - Read-only via CSV export URL
 *    Falls back automatically when no service account is configured
 */

import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.GOOGLE_SHEET_ID || '1cBUd2-hFPqPvY444GJ82GRjfSsZn20kPcSrQib3bhkE';

// Sheet tab names matching the Google Sheet
const SHEETS = {
  USERS: 'Users',
  CURRICULUM: 'Curriculum',
  SUBJECTS: 'Subjects',
  SPECIAL_COURSES: 'Special_Courses',
  PROGRESS: 'Progress',
  CONFIG: 'Config',
} as const;

export interface SheetUser {
  name: string;
  phone: string;
  grade: number;
  board: string;
  field: string;
  status: string; // 'paid' | 'free' | etc.
  startDate: string;
  targetDate: string;
  currentDay: number;
  totalDays: number;
  topicsDone: number;
  daysLeft: number;
  academicGroup: string;
  topicsPerDay: number;
  pin: string;
}

export interface SheetProgress {
  phone: string;
  topicId: string;
  completed: boolean;
  dateCompleted: string;
}

// ============================================
// Authentication: Service Account or Public
// ============================================

const hasServiceAccount = !!(process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY);

function getAuth() {
  if (hasServiceAccount) {
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      undefined,
      process.env.GOOGLE_PRIVATE_KEY!.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );
    return auth;
  }
  return null;
}

function getSheets() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth: auth || undefined });
}

// ============================================
// CSV Fallback for Public Sheets
// ============================================

async function fetchSheetAsCSV(sheetName: string): Promise<string[][]> {
  // Google Sheets public CSV export URL
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&gid=${getGidForSheet(sheetName)}`;
  
  try {
    const response = await fetch(url, { 
      next: { revalidate: 300 }, // Cache for 5 minutes at fetch level
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet ${sheetName}: ${response.status}`);
    }
    
    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error(`CSV fetch failed for ${sheetName}:`, error);
    // Try with sheet name directly
    const url2 = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/export?format=csv&sheet=${encodeURIComponent(sheetName)}`;
    const response2 = await fetch(url2);
    if (!response2.ok) {
      throw new Error(`Failed to fetch sheet ${sheetName}: ${response2.status}`);
    }
    const csvText2 = await response2.text();
    return parseCSV(csvText2);
  }
}

function getGidForSheet(sheetName: string): string {
  // GID mapping from the Google Sheet (can be found in the URL when viewing the sheet)
  // These may need to be updated if the sheet structure changes
  const gidMap: Record<string, string> = {
    'Users': '0',
    'Curriculum': '1362489824',
    'Subjects': '1889968957',
    'Special_Courses': '504940510',
    'Progress': '775908587',
    'Config': '1538965252',
  };
  return gidMap[sheetName] || '0';
}

function parseCSV(csv: string): string[][] {
  const lines: string[][] = [];
  let current = '';
  let inQuotes = false;
  let row: string[] = [];
  
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < csv.length && csv[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        row.push(current.trim());
        current = '';
      } else if (char === '\n' || (char === '\r' && i + 1 < csv.length && csv[i + 1] === '\n')) {
        row.push(current.trim());
        if (row.some(cell => cell !== '')) {
          lines.push(row);
        }
        row = [];
        current = '';
        if (char === '\r') i++;
      } else {
        current += char;
      }
    }
  }
  
  // Don't forget the last cell/row
  row.push(current.trim());
  if (row.some(cell => cell !== '')) {
    lines.push(row);
  }
  
  return lines;
}

// ============================================
// In-Memory Cache with TTL
// ============================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache: Map<string, CacheEntry<unknown>> = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data as T;
  }
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(key?: string): void {
  if (key) {
    cache.delete(key);
  } else {
    cache.clear();
  }
}

// ============================================
// Read Users from Google Sheet
// ============================================

export async function fetchUsersFromSheet(forceRefresh = false): Promise<SheetUser[]> {
  const cacheKey = 'sheet_users';
  
  if (!forceRefresh) {
    const cached = getCached<SheetUser[]>(cacheKey);
    if (cached) return cached;
  }

  try {
    let rows: string[][] = [];

    if (hasServiceAccount) {
      // Use Google Sheets API with service account
      const sheets = getSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.USERS}!A:P`,
      });
      rows = response.data.values || [];
    } else {
      // Use CSV export for public sheets
      rows = await fetchSheetAsCSV(SHEETS.USERS);
    }

    if (rows.length < 2) {
      console.warn('No user data found in sheet');
      return [];
    }

    // Skip header row, parse data rows
    const users: SheetUser[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      // Skip empty rows (no name or phone)
      if (!row[0] || !row[1]) continue;
      
      users.push({
        name: String(row[0] || '').trim(),
        phone: String(row[1] || '').trim(),
        grade: parseInt(String(row[2] || '10'), 10) || 10,
        board: String(row[3] || '').trim(),
        field: String(row[4] || '').trim(),
        status: String(row[5] || 'free').trim().toLowerCase(),
        startDate: String(row[6] || '').trim(),
        targetDate: String(row[7] || '').trim(),
        currentDay: parseInt(String(row[8] || '1'), 10) || 1,
        totalDays: parseInt(String(row[9] || '438'), 10) || 438,
        topicsDone: parseInt(String(row[11] || '0'), 10) || 0,
        daysLeft: parseInt(String(row[12] || '423'), 10) || 423,
        academicGroup: String(row[13] || '').trim(),
        topicsPerDay: parseInt(String(row[14] || '4'), 10) || 4,
        pin: String(row[15] || '').trim(),
      });
    }

    setCache(cacheKey, users);
    console.log(`✅ Fetched ${users.length} users from live Google Sheet (${hasServiceAccount ? 'API' : 'CSV'})`);
    return users;
  } catch (error) {
    console.error('Failed to fetch users from sheet:', error);
    const cached = getCached<SheetUser[]>(cacheKey);
    if (cached) return cached;
    return [];
  }
}

// ============================================
// Find User by Phone (for authentication)
// ============================================

export async function findUserByPhone(phone: string, forceRefresh = false): Promise<SheetUser | null> {
  const users = await fetchUsersFromSheet(forceRefresh);
  return users.find(u => u.phone === phone) || null;
}

// ============================================
// Read Progress from Google Sheet
// ============================================

export async function fetchProgressFromSheet(forceRefresh = false): Promise<SheetProgress[]> {
  const cacheKey = 'sheet_progress';
  
  if (!forceRefresh) {
    const cached = getCached<SheetProgress[]>(cacheKey);
    if (cached) return cached;
  }

  try {
    let rows: string[][] = [];

    if (hasServiceAccount) {
      const sheets = getSheets();
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.PROGRESS}!A:D`,
      });
      rows = response.data.values || [];
    } else {
      rows = await fetchSheetAsCSV(SHEETS.PROGRESS);
    }

    if (rows.length < 2) {
      return [];
    }

    const progress: SheetProgress[] = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0] || !row[1]) continue;
      
      progress.push({
        phone: String(row[0] || '').trim(),
        topicId: String(row[1] || '').trim(),
        completed: String(row[2] || '').trim().toLowerCase() === 'true' || String(row[2] || '').trim() === '1',
        dateCompleted: String(row[3] || '').trim(),
      });
    }

    setCache(cacheKey, progress);
    return progress;
  } catch (error) {
    console.error('Failed to fetch progress from sheet:', error);
    const cached = getCached<SheetProgress[]>(cacheKey);
    if (cached) return cached;
    return [];
  }
}

// ============================================
// Write Progress back to Google Sheet
// ============================================

export async function writeProgressToSheet(
  phone: string,
  topicId: string,
  completed: boolean
): Promise<boolean> {
  if (!hasServiceAccount) {
    // Cannot write to public sheets without service account
    console.warn('Cannot write to Google Sheet: No service account configured. Progress saved locally only.');
    return false;
  }

  try {
    const sheets = getSheets();
    
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.PROGRESS}!A:D`,
    });

    const rows = existing.data.values || [];
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === phone && rows[i][1] === topicId) {
        rowIndex = i + 1;
        break;
      }
    }

    const dateStr = completed ? new Date().toISOString().split('T')[0] : '';

    if (rowIndex > 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.PROGRESS}!A${rowIndex}:D${rowIndex}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [[phone, topicId, completed ? 'TRUE' : 'FALSE', dateStr]],
        },
      });
    } else {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEETS.PROGRESS}!A:D`,
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values: [[phone, topicId, completed ? 'TRUE' : 'FALSE', dateStr]],
        },
      });
    }

    invalidateCache('sheet_progress');
    return true;
  } catch (error) {
    console.error('Failed to write progress to sheet:', error);
    return false;
  }
}

// ============================================
// Update User in Google Sheet
// ============================================

export async function updateUserInSheet(
  phone: string,
  updates: Partial<SheetUser>
): Promise<boolean> {
  if (!hasServiceAccount) {
    console.warn('Cannot write to Google Sheet: No service account configured.');
    return false;
  }

  try {
    const sheets = getSheets();
    
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEETS.USERS}!A:P`,
    });

    const rows = existing.data.values || [];
    let rowIndex = -1;
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][1] === phone) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) {
      console.warn(`User with phone ${phone} not found in sheet`);
      return false;
    }

    const columnMap: Record<keyof SheetUser, string> = {
      name: 'A', phone: 'B', grade: 'C', board: 'D', field: 'E', status: 'F',
      startDate: 'G', targetDate: 'H', currentDay: 'I', totalDays: 'J',
      topicsDone: 'L', daysLeft: 'M', academicGroup: 'N', topicsPerDay: 'O', pin: 'P',
    };

    for (const [key, value] of Object.entries(updates)) {
      if (columnMap[key as keyof SheetUser]) {
        const col = columnMap[key as keyof SheetUser];
        await sheets.spreadsheets.values.update({
          spreadsheetId: SPREADSHEET_ID,
          range: `${SHEETS.USERS}!${col}${rowIndex}`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [[String(value)]],
          },
        });
      }
    }

    invalidateCache('sheet_users');
    return true;
  } catch (error) {
    console.error('Failed to update user in sheet:', error);
    return false;
  }
}

// ============================================
// Health check
// ============================================

export async function testSheetConnection(): Promise<{ connected: boolean; userCount: number; error?: string }> {
  try {
    const users = await fetchUsersFromSheet(true);
    return { connected: true, userCount: users.length };
  } catch (error) {
    return { connected: false, userCount: 0, error: String(error) };
  }
}
