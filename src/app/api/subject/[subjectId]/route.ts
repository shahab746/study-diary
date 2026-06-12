import { NextRequest, NextResponse } from 'next/server';
import {
  buildCurriculumHierarchy,
  fetchProgressFromSheet,
  findUserByPhone,
} from '@/lib/sheet-sync';
import { findUserByPhone as findUserByPhoneDB, isSupabaseConfigured, dbUserToSheetUser, getUserProgress } from '@/lib/supabase';
import { findRegisteredUserByPhone } from '@/lib/registered-users';

// ─── Color & Icon Mapping ───────────────────────────────────────────────────────
const COLOR_MAP: Record<string, string> = {
  'Blue': '#3B82F6', 'Teal': '#14B8A6', 'Purple': '#8B5CF6', 'Green': '#22C55E',
  'Amber': '#F59E0B', 'Rose': '#F43F5E', 'Sky': '#0EA5E9', 'Orange': '#F97316',
  'Emerald': '#10B981', 'Gray': '#6B7280', 'Red': '#EF4444',
};
const SUBJECT_ICON_MAP: Record<string, string> = {
  'Physics': 'atom', 'Chemistry': 'beaker', 'Computer Science': 'cpu',
  'Biology': 'beaker', 'Mathematics': 'pi', 'Maths': 'pi',
  'English': 'book', 'Urdu': 'book', 'Pak Studies': 'landmark', 'Islamiat': 'landmark',
};
function mapColor(color: string): string {
  if (color?.startsWith('#')) return color;
  return COLOR_MAP[color] || '#6B7280';
}
function mapIcon(icon: string, name?: string): string {
  if (name && SUBJECT_ICON_MAP[name]) return SUBJECT_ICON_MAP[name];
  return 'book';
}

// Normalize student status — same logic as data route
function normalizeStatus(status: string): string {
  if (!status) return 'free';
  const s = status.toLowerCase().trim();
  if (s === 'true' || s === 'paid') return 'paid';
  if (s === 'false' || s === 'free') return 'free';
  if (s === 'blocked' || s === 'disabled') return s;
  return s;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params;
    const url = new URL(request.url);
    const phone = url.searchParams.get('phone') || '';

    // Fetch curriculum hierarchy
    const subjects = await buildCurriculumHierarchy();

    // Fetch progress — Supabase first, then Sheets fallback
    let progressRows: Array<{ phone: string; topicId: string; completed: boolean }> = [];
    let useSupabaseProgress = false;

    if (phone && isSupabaseConfigured()) {
      const dbUser = await findUserByPhoneDB(phone);
      if (dbUser) {
        useSupabaseProgress = true;
        const dbProgress = await getUserProgress(phone);
        progressRows = dbProgress.map(p => ({
          phone: p.phone,
          topicId: p.topic_id,
          completed: p.completed,
        }));
      }
    }

    if (!useSupabaseProgress && phone) {
      const sheetProgress = await fetchProgressFromSheet();
      progressRows = sheetProgress.map(p => ({
        phone: p.phone,
        topicId: p.topicId,
        completed: p.completed,
      }));
    }

    // Find the subject by ID
    const subject = subjects.find(s => s.id === subjectId);
    if (!subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    // ─── Determine user status with same multi-source lookup as data API ───
    let userStatus = 'free'; // default

    if (phone) {
      // 1. Try Supabase first
      if (isSupabaseConfigured()) {
        const dbUser = await findUserByPhoneDB(phone);
        if (dbUser) {
          const sheetUser = dbUserToSheetUser(dbUser);
          userStatus = normalizeStatus(sheetUser.status);
        }
      }

      // 2. Fallback: Google Sheets
      if (userStatus === 'free') {
        const sheetUser = await findUserByPhone(phone, false);
        if (sheetUser) {
          userStatus = normalizeStatus(sheetUser.status);
        }
      }

      // 3. Fallback: registered-users cache
      if (userStatus === 'free') {
        const cachedUser = await findRegisteredUserByPhone(phone, false);
        if (cachedUser) {
          userStatus = normalizeStatus(cachedUser.status);
        }
      }
    }

    const isFreeUser = userStatus === 'free';

    // Check Group_Eligibility
    if (subject.groupEligibility && subject.groupEligibility !== 'Both' && phone) {
      let userGroup = '';
      if (isSupabaseConfigured()) {
        const dbUser = await findUserByPhoneDB(phone);
        if (dbUser) {
          const sheetUser = dbUserToSheetUser(dbUser);
          userGroup = sheetUser.academicGroup || '';
        }
      }
      if (!userGroup) {
        const sheetUser = await findUserByPhone(phone, false);
        userGroup = sheetUser?.academicGroup || '';
      }
      if (userGroup && subject.groupEligibility !== userGroup) {
        return NextResponse.json({ error: 'Not eligible for this subject' }, { status: 403 });
      }
    }

    // Build progress lookup
    const completedTopicIds = new Set(
      progressRows.filter(p => p.phone === phone && p.completed).map(p => p.topicId)
    );

    // Build result
    const result = {
      id: subject.id,
      name: subject.name,
      color: mapColor(subject.color),
      icon: mapIcon(subject.icon, subject.name),
      grade: subject.grade,
      board: subject.board,
      field: subject.field,
      totalTopics: subject.totalTopics,
      chapterCount: subject.chapterCount,
      chapters: subject.chapters.map(ch => ({
        id: ch.id,
        number: ch.number,
        name: ch.name,
        topics: ch.topics.map(t => {
          // Free users: hide video/PDF links on premium topics (isFree = false)
          const isTopicFree = !!t.isFree;
          const hideLinks = isFreeUser && !isTopicFree;
          return {
            id: t.id,
            number: t.number,
            name: t.name,
            videoLink: hideLinks ? '' : (t.videoLink || ''),
            pdfLink: hideLinks ? '' : (t.pdfLink || ''),
            hasVideo: hideLinks ? false : !!(t.videoLink && t.videoLink.startsWith('http')),
            hasPdf: hideLinks ? false : !!(t.pdfLink && t.pdfLink.startsWith('http')),
            dayNumber: t.dayNumber || 0,
            completed: completedTopicIds.has(t.id),
            isFree: isTopicFree,
          };
        }),
        completedTopics: ch.topics.filter(t => completedTopicIds.has(t.id)).length,
        totalTopics: ch.topics.length,
      })),
      completedTopics: subject.chapters.flatMap(ch => ch.topics).filter(t => completedTopicIds.has(t.id)).length,
      isFreeUser,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error fetching subject:', error);
    return NextResponse.json({
      error: 'Failed to fetch subject',
      detail: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
