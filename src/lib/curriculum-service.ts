/**
 * Curriculum Service — Prisma/SQLite-based curriculum hierarchy builder
 *
 * Replaces the Google Sheets `buildCurriculumHierarchy()` from sheet-sync.ts.
 * Reads subjects, chapters, and topics from the local Prisma SQLite database
 * and returns data in the same `BuiltSubject[]` format.
 *
 * This solves the problem where the Google Sheets "Curriculum" tab is broken
 * (returns Users data instead), causing 0 subjects to be shown.
 */

import { db } from '@/lib/db';
import type { BuiltSubject, BuiltChapter, BuiltTopic } from '@/lib/sheet-sync';

// ============================================
// Subject Styling (same as sheet-sync.ts)
// ============================================

const SUBJECT_STYLING: Record<string, { color: string; icon: string; order: number }> = {
  'Physics': { color: 'Blue', icon: '⚛️', order: 1 },
  'Chemistry': { color: 'Teal', icon: '🧪', order: 2 },
  'Computer Science': { color: 'Purple', icon: '💻', order: 3 },
  'Biology': { color: 'Green', icon: '🧬', order: 4 },
  'Maths': { color: 'Amber', icon: '📐', order: 5 },
  'Mathematics': { color: 'Amber', icon: '📐', order: 5 },
  'English': { color: 'Rose', icon: '📖', order: 6 },
  'Urdu': { color: 'Sky', icon: '📝', order: 7 },
  'Pak Studies': { color: 'Orange', icon: '🇵🇰', order: 8 },
  'Islamiat': { color: 'Emerald', icon: '☪️', order: 9 },
};

// ============================================
// Build Curriculum Hierarchy from Prisma DB
// ============================================

export async function buildCurriculumHierarchyFromDb(): Promise<BuiltSubject[]> {
  const subjects = await db.subject.findMany({
    include: {
      chapters: {
        include: {
          topics: true,
        },
        orderBy: { number: 'asc' },
      },
    },
    orderBy: { order: 'asc' },
  });

  if (subjects.length === 0) return [];

  const builtSubjects: BuiltSubject[] = subjects.map(subject => {
    const styling = SUBJECT_STYLING[subject.name] || { color: subject.color || 'Gray', icon: subject.icon || '📚', order: subject.order || 99 };

    const chapters: BuiltChapter[] = subject.chapters.map(chapter => {
      const topics: BuiltTopic[] = chapter.topics.map(topic => ({
        id: topic.id,
        chapterId: topic.chapterId,
        number: topic.number,
        name: topic.name,
        videoLink: topic.videoLink || '',
        pdfLink: topic.pdfLink || '',
        isFree: topic.isFree,
        dayNumber: topic.dayNumber,
      }));

      return {
        id: chapter.id,
        subjectId: chapter.subjectId,
        number: chapter.number,
        name: chapter.name,
        topics,
      };
    });

    const totalTopics = chapters.reduce((sum, ch) => sum + ch.topics.length, 0);

    return {
      id: subject.id,
      name: subject.name,
      grade: subject.grade,
      board: subject.board,
      field: subject.field,
      totalTopics,
      chapterCount: subject.chapters.length,
      color: styling.color,
      icon: styling.icon,
      order: styling.order,
      groupEligibility: subject.groupEligibility || 'Both',
      chapters,
    };
  });

  // Sort by order
  builtSubjects.sort((a, b) => a.order - b.order);
  return builtSubjects;
}

// ============================================
// Fetch Special Courses from Prisma DB
// ============================================

export async function fetchSpecialCoursesFromDb() {
  const courses = await db.specialCourse.findMany({ orderBy: { order: 'asc' } });
  return courses.map(c => ({
    name: c.name,
    subject: c.subject,
    topic: c.topic,
    videoLink: c.videoLink,
    pdfLink: c.pdfLink,
    grade: c.grade,
    board: c.board,
    order: c.order,
  }));
}
