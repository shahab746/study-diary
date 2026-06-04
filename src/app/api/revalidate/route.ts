import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath, revalidateTag } from 'next/cache';
import { invalidateCache } from '@/lib/sheet-sync';

/**
 * On-Demand Cache Revalidation API Route
 * 
 * Called by Google Apps Script webhook whenever a row is modified or added.
 * Supports both path-based and tag-based revalidation.
 * Also clears the in-memory sheet-sync cache so the next request fetches fresh data.
 * 
 * Usage:
 *   POST /api/revalidate
 *   Body: { secret: string, type: 'path' | 'tag' | 'full' | 'sheet', target?: string }
 * 
 * Examples:
 *   { secret: '...', type: 'path', target: '/' }                    — revalidates the home page
 *   { secret: '...', type: 'path', target: '/api/data' }            — revalidates the data API
 *   { secret: '...', type: 'tag', target: 'curriculum' }            — revalidates all curriculum-tagged data
 *   { secret: '...', type: 'tag', target: 'users' }                 — revalidates all user-tagged data
 *   { secret: '...', type: 'full' }                                 — full cache purge (ISR + in-memory)
 *   { secret: '...', type: 'sheet', target: 'users' }               — clears specific in-memory sheet cache key
 * 
 * Google Apps Script Blueprint:
 *   Set up an installable trigger (onEdit) in the sheet's Apps Script editor:
 * 
 *   function onSheetEdit(e) {
 *     var SHEET_MAP = {
 *       'Users': 'users',
 *       'Curriculum': 'curriculum',
 *       'Subjects': 'subjects',
 *       'Special_Courses': 'special_courses',
 *       'Progress': 'progress',
 *       'Config': 'config'
 *     };
 *     var sheetName = e.source.getActiveSheet().getName();
 *     var cacheKey = SHEET_MAP[sheetName];
 *     if (!cacheKey) return;
 *     
 *     var REVALIDATION_SECRET = 'lecture-diary-revalidation-2024';
 *     var WEBHOOK_URL = 'https://lecturediary.space-z.ai/api/revalidate';
 *     
 *     UrlFetchApp.fetch(WEBHOOK_URL, {
 *       method: 'post',
 *       contentType: 'application/json',
 *       payload: JSON.stringify({
 *         secret: REVALIDATION_SECRET,
 *         type: 'sheet',
 *         target: cacheKey
 *       }),
 *       muteHttpExceptions: true
 *     });
 *   }
 */

const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET || 'lecture-diary-revalidation-2024';

// Map friendly sheet names to in-memory cache keys used by sheet-sync.ts
const SHEET_CACHE_KEY_MAP: Record<string, string> = {
  'users': 'sheet_users',
  'curriculum': 'sheet_curriculum',
  'subjects': 'sheet_subjects',
  'special_courses': 'sheet_special_courses',
  'progress': 'sheet_progress',
  'config': 'sheet_config',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { secret, type, target } = body;

    // Verify the secret to prevent unauthorized cache purges
    if (secret !== REVALIDATION_SECRET) {
      return NextResponse.json(
        { error: 'Invalid revalidation secret' },
        { status: 401 }
      );
    }

    // Sheet-specific in-memory cache invalidation (called by Apps Script webhook)
    if (type === 'sheet' && target) {
      const cacheKey = SHEET_CACHE_KEY_MAP[target] || `sheet_${target}`;
      invalidateCache(cacheKey);
      // Also revalidate the ISR cache for the main data paths
      revalidatePath('/api/data');
      revalidatePath('/api/sync');
      console.log(`[REVALIDATE] Sheet cache invalidated: ${target} (key: ${cacheKey})`);
      return NextResponse.json({
        revalidated: true,
        type: 'sheet',
        target,
        cacheKey,
        timestamp: new Date().toISOString(),
      });
    }

    if (type === 'full') {
      // Full cache purge — clear all in-memory cache + ISR paths + tags
      invalidateCache(); // Clear entire in-memory sheet-sync cache
      const paths = ['/', '/api/data', '/api/sync'];
      const tags = ['curriculum', 'users', 'subjects', 'progress'];

      for (const path of paths) {
        revalidatePath(path);
      }
      for (const tag of tags) {
        revalidateTag(tag);
      }

      console.log('[REVALIDATE] Full cache purge completed (ISR + in-memory)');
      return NextResponse.json({
        revalidated: true,
        type: 'full',
        paths,
        tags,
        inMemoryCleared: true,
        timestamp: new Date().toISOString(),
      });
    }

    if (type === 'path' && target) {
      revalidatePath(target);
      // Also clear in-memory cache for data paths
      if (target.includes('data') || target.includes('sync')) {
        invalidateCache();
      }
      console.log(`[REVALIDATE] Path revalidated: ${target}`);
      return NextResponse.json({
        revalidated: true,
        type: 'path',
        target,
        timestamp: new Date().toISOString(),
      });
    }

    if (type === 'tag' && target) {
      revalidateTag(target);
      // Map tag to in-memory cache key and invalidate
      const tagToCacheKey: Record<string, string> = {
        'curriculum': 'sheet_curriculum',
        'users': 'sheet_users',
        'subjects': 'sheet_subjects',
        'progress': 'sheet_progress',
      };
      if (tagToCacheKey[target]) {
        invalidateCache(tagToCacheKey[target]);
      }
      console.log(`[REVALIDATE] Tag revalidated: ${target}`);
      return NextResponse.json({
        revalidated: true,
        type: 'tag',
        target,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Invalid request. Provide type (path|tag|full|sheet) and target.' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[REVALIDATE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to revalidate' },
      { status: 500 }
    );
  }
}

// GET endpoint for quick health check / last revalidation status
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Revalidation API is active. Send POST with { secret, type, target } to revalidate.',
    supportedTypes: ['path', 'tag', 'full', 'sheet'],
    sheetTargets: Object.keys(SHEET_CACHE_KEY_MAP),
    note: 'Configure Google Apps Script onEdit trigger to POST here on sheet changes.',
  });
}
