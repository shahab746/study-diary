import { db } from '@/lib/db';
import { fetchUsersFromSheet, fetchCurriculumFromSheet, invalidateCache } from '@/lib/sheet-sync';
import { NextResponse } from 'next/server';

/**
 * Sync data from Google Sheets to the local database
 * 
 * GET /api/sync?type=users       — Sync user profiles
 * GET /api/sync?type=subjects    — Sync subject eligibility only
 * GET /api/sync?type=curriculum  — Full curriculum sync (subjects + chapters + topics)
 * GET /api/sync?type=full        — Sync everything (users + curriculum)
 */

// Track last sync time to avoid hammering Google Sheets
let lastCurriculumSync = 0;
const CURRICULUM_SYNC_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes between full curriculum syncs

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'users';
    const force = url.searchParams.get('force') === 'true';

    if (type === 'users') {
      return await syncUsers();
    }

    if (type === 'subjects') {
      return await syncSubjectsEligibility();
    }

    if (type === 'curriculum') {
      // Respect cooldown unless forced
      if (!force && Date.now() - lastCurriculumSync < CURRICULUM_SYNC_COOLDOWN_MS) {
        return NextResponse.json({
          success: true,
          message: `Curriculum sync skipped (cooldown: ${Math.round((CURRICULUM_SYNC_COOLDOWN_MS - (Date.now() - lastCurriculumSync)) / 1000)}s remaining). Use ?force=true to override.`,
          cooldown: true,
        });
      }
      return await syncCurriculum();
    }

    if (type === 'full') {
      const userRes = await syncUsers();
      const curriculumRes = await syncCurriculum();
      const userData = await userRes.json();
      const curriculumData = await curriculumRes.json();
      return NextResponse.json({
        success: true,
        users: userData,
        curriculum: curriculumData,
      });
    }

    return NextResponse.json({ error: 'Invalid sync type. Use "users", "subjects", "curriculum", or "full"' }, { status: 400 });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Sync failed: ' + String(error) }, { status: 500 });
  }
}

async function syncUsers() {
  const sheetUsers = await fetchUsersFromSheet(true);
  let synced = 0;
  let updated = 0;

  for (const su of sheetUsers) {
    const existing = await db.student.findUnique({ where: { phone: su.phone } });

    const data = {
      name: su.name,
      phone: su.phone,
      grade: su.grade,
      board: su.board,
      field: su.field,
      status: su.status,
      startDate: su.startDate ? new Date(su.startDate) : new Date(),
      targetDate: su.targetDate ? new Date(su.targetDate) : new Date(),
      currentDay: su.currentDay,
      totalDays: su.totalDays,
      topicsDone: su.topicsDone,
      daysLeft: su.daysLeft,
      pin: su.pin,
      academicGroup: su.academicGroup,
    };

    if (existing) {
      await db.student.update({
        where: { phone: su.phone },
        data,
      });
      updated++;
    } else {
      await db.student.create({ data });
      synced++;
    }
  }

  return NextResponse.json({ synced, updated, total: sheetUsers.length });
}

async function syncSubjectsEligibility() {
  const curriculum = await fetchCurriculumFromSheet(true);

  const subjectMap = new Map<string, { groupEligibility: string }>();
  for (const row of curriculum) {
    const key = `${row.subject}-${row.grade}`;
    if (!subjectMap.has(key)) {
      subjectMap.set(key, { groupEligibility: row.groupEligibility || 'Both' });
    }
  }

  const subjects = await db.subject.findMany();
  let updatedCount = 0;
  for (const subject of subjects) {
    const key = `${subject.name}-${subject.grade}`;
    const mapping = subjectMap.get(key);
    if (mapping && mapping.groupEligibility !== subject.groupEligibility) {
      await db.subject.update({
        where: { id: subject.id },
        data: { groupEligibility: mapping.groupEligibility },
      });
      updatedCount++;
    }
  }

  return NextResponse.json({
    success: true,
    message: `Updated ${updatedCount} subjects with eligibility from Curriculum sheet`,
    totalMappings: subjectMap.size,
  });
}

/**
 * Full curriculum sync: Pulls ALL curriculum data from Google Sheets
 * and upserts subjects, chapters, and topics into the local DB.
 * 
 * Strategy:
 * - Group curriculum rows by Subject → Chapter → Topic
 * - For each subject: find existing by name+grade, or create new
 * - For each chapter: find existing by subject+number, or create new
 * - For each topic: find existing by chapter+number, update name/links
 * - Delete topics/chapters that no longer exist in the sheet
 * - Preserve progress data (don't delete topics that have progress)
 */
async function syncCurriculum() {
  console.log('🔄 Starting full curriculum sync from Google Sheets...');
  const startTime = Date.now();

  const curriculum = await fetchCurriculumFromSheet(true);

  if (curriculum.length === 0) {
    return NextResponse.json({
      success: false,
      message: 'No curriculum data found in Google Sheet',
    });
  }

  // Group curriculum rows by subject-grade
  const subjectGroups = new Map<string, typeof curriculum>();
  for (const row of curriculum) {
    const key = `${row.subject}|||${row.grade}`;
    if (!subjectGroups.has(key)) {
      subjectGroups.set(key, []);
    }
    subjectGroups.get(key)!.push(row);
  }

  let subjectsCreated = 0;
  let subjectsUpdated = 0;
  let chaptersCreated = 0;
  let chaptersUpdated = 0;
  let topicsCreated = 0;
  let topicsUpdated = 0;
  let topicsDeleted = 0;
  let chaptersDeleted = 0;

  // Subject icon/color mapping
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

  // Subject name aliases — so "Mathematics" in the sheet matches "Maths" in the DB
  const SUBJECT_ALIASES: Record<string, string[]> = {
    'Mathematics': ['Mathematics', 'Maths'],
    'Maths': ['Maths', 'Mathematics'],
    'Computer Science': ['Computer Science', 'CS', 'Computer'],
    'Physics': ['Physics'],
    'Chemistry': ['Chemistry'],
    'Biology': ['Biology'],
  };

  for (const [subjectKey, rows] of subjectGroups) {
    const [subjectName, grade] = subjectKey.split('|||');

    // Get the first row's board/field info
    const firstRow = rows[0];
    const board = firstRow.board || 'BISE Abbottabad';
    const field = firstRow.field || 'Science';
    const styling = SUBJECT_STYLING[subjectName] || { color: 'Gray', icon: '📚', order: 99 };

    // Group rows by chapter
    const chapterGroups = new Map<string, typeof curriculum>();
    for (const row of rows) {
      const chKey = `${row.chapterNo}|||${row.chapterName}`;
      if (!chapterGroups.has(chKey)) {
        chapterGroups.set(chKey, []);
      }
      chapterGroups.get(chKey)!.push(row);
    }

    const totalTopics = rows.length;
    const totalChapters = chapterGroups.size;

    // Find or create the subject
    // Normalize grade for matching (could be "10" or "Grade 10")
    const gradeVariants = [grade, `Grade ${grade}`, grade.replace('Grade ', '')];

    const nameVariants = SUBJECT_ALIASES[subjectName] || [subjectName];

    let subject = await db.subject.findFirst({
      where: {
        name: { in: nameVariants },
        grade: { in: gradeVariants },
      },
      include: { chapters: { include: { topics: true } } },
    });

    if (subject) {
      // Update existing subject
      await db.subject.update({
        where: { id: subject.id },
        data: {
          totalTopics,
          chapterCount: totalChapters,
          color: styling.color,
          icon: styling.icon,
          board,
          field,
          groupEligibility: firstRow.groupEligibility || 'Both',
        },
      });
      subjectsUpdated++;
    } else {
      // Create new subject
      subject = await db.subject.create({
        data: {
          name: subjectName,
          grade: grade.startsWith('Grade') ? grade : `Grade ${grade}`,
          board,
          field,
          totalTopics,
          chapterCount: totalChapters,
          color: styling.color,
          icon: styling.icon,
          order: styling.order,
          groupEligibility: firstRow.groupEligibility || 'Both',
        },
        include: { chapters: { include: { topics: true } } },
      });
      subjectsCreated++;
      console.log(`  ✨ Created new subject: ${subjectName} (Grade ${grade})`);
    }

    // Track which chapter/topic IDs are in the sheet (for deletion detection)
    const sheetChapterIds = new Set<string>();
    const sheetTopicIds = new Set<string>();

    // Sync chapters and topics
    for (const [chapterKey, chapterRows] of chapterGroups) {
      const [chapterNoStr, chapterName] = chapterKey.split('|||');
      const chapterNo = parseInt(chapterNoStr) || 0;

      // Find existing chapter
      let chapter = subject.chapters.find(ch => ch.number === chapterNo);

      if (chapter) {
        // Update chapter name if changed
        if (chapter.name !== chapterName) {
          await db.chapter.update({
            where: { id: chapter.id },
            data: { name: chapterName },
          });
          chaptersUpdated++;
        }
        sheetChapterIds.add(chapter.id);
      } else {
        // Create new chapter
        chapter = await db.chapter.create({
          data: {
            subjectId: subject.id,
            number: chapterNo,
            name: chapterName,
          },
          include: { topics: true },
        });
        // Add to subject's chapters for subsequent lookups
        subject.chapters.push(chapter);
        chaptersCreated++;
        sheetChapterIds.add(chapter.id);
      }

      // Sync topics within this chapter
      for (const row of chapterRows) {
        // Find existing topic by number within this chapter
        const existingTopic = chapter.topics?.find(t => t.number === row.topicNo);

        if (existingTopic) {
          // Update topic if any fields changed
          const videoLink = row.videoLink || '';
          const pdfLink = row.pdfLink || '';
          if (
            existingTopic.name !== row.topicName ||
            existingTopic.videoLink !== videoLink ||
            existingTopic.pdfLink !== pdfLink
          ) {
            await db.topic.update({
              where: { id: existingTopic.id },
              data: {
                name: row.topicName,
                videoLink,
                pdfLink,
                isFree: row.isFree,
                dayNumber: row.totalDays || existingTopic.dayNumber,
              },
            });
            topicsUpdated++;
          }
          sheetTopicIds.add(existingTopic.id);
        } else {
          // Create new topic
          const newTopic = await db.topic.create({
            data: {
              chapterId: chapter.id,
              number: row.topicNo,
              name: row.topicName,
              videoLink: row.videoLink || '',
              pdfLink: row.pdfLink || '',
              isFree: row.isFree,
              dayNumber: row.totalDays || 0,
            },
          });
          // Add to chapter's topics for subsequent lookups
          if (!chapter.topics) chapter.topics = [];
          chapter.topics.push(newTopic);
          topicsCreated++;
          sheetTopicIds.add(newTopic.id);
        }
      }
    }

    // Delete topics that are no longer in the sheet (but preserve ones with progress)
    for (const chapter of subject.chapters) {
      if (!sheetChapterIds.has(chapter.id)) {
        // This chapter is no longer in the sheet — check if any topic has progress
        const hasProgress = await db.progress.findFirst({
          where: { topicId: { in: chapter.topics.map(t => t.id) } },
        });
        if (!hasProgress) {
          await db.chapter.delete({ where: { id: chapter.id } });
          chaptersDeleted++;
        }
        continue;
      }

      for (const topic of chapter.topics) {
        if (!sheetTopicIds.has(topic.id)) {
          // This topic is no longer in the sheet — check if it has progress
          const hasProgress = await db.progress.findFirst({
            where: { topicId: topic.id },
          });
          if (!hasProgress) {
            await db.topic.delete({ where: { id: topic.id } });
            topicsDeleted++;
          }
        }
      }
    }
  }

  // Clean up duplicate subjects (e.g., "Maths" and "Mathematics" for same grade)
  // Keep the one that was synced (has matching sheet data), delete the other if it has no progress
  const allSubjects = await db.subject.findMany({
    include: { chapters: { include: { topics: { include: { progress: true } } } } },
  });

  // Group by alias + grade to find duplicates
  const subjectGroups_byAlias = new Map<string, typeof allSubjects>();
  for (const subj of allSubjects) {
    // Find the canonical name for this subject
    let canonicalName = subj.name;
    for (const [alias, variants] of Object.entries(SUBJECT_ALIASES)) {
      if (variants.includes(subj.name)) {
        canonicalName = alias;
        break;
      }
    }
    const key = `${canonicalName}|||${subj.grade}`;
    if (!subjectGroups_byAlias.has(key)) {
      subjectGroups_byAlias.set(key, []);
    }
    subjectGroups_byAlias.get(key)!.push(subj);
  }

  let subjectsMerged = 0;
  for (const [, duplicates] of subjectGroups_byAlias) {
    if (duplicates.length <= 1) continue;

    // Sort: prefer subjects with more video links (real data from sheet)
    duplicates.sort((a, b) => {
      const aVideoCount = a.chapters.reduce((sum, ch) => sum + ch.topics.filter(t => t.videoLink).length, 0);
      const bVideoCount = b.chapters.reduce((sum, ch) => sum + ch.topics.filter(t => t.videoLink).length, 0);
      return bVideoCount - aVideoCount;
    });

    // Keep the first (best) subject, delete the rest if they have no progress
    const keepSubject = duplicates[0];
    for (let i = 1; i < duplicates.length; i++) {
      const dup = duplicates[i];
      const hasProgress = dup.chapters.some(ch =>
        ch.topics.some(t => t.progress.length > 0)
      );
      if (!hasProgress) {
        await db.subject.delete({ where: { id: dup.id } });
        subjectsMerged++;
        console.log(`  🗑️ Deleted duplicate subject: ${dup.name} (Grade ${dup.grade}), keeping ${keepSubject.name}`);
      }
    }
  }

  // Invalidate the in-memory cache so /api/data returns fresh data
  invalidateCache();

  const elapsed = Date.now() - startTime;
  lastCurriculumSync = Date.now();

  const result = {
    success: true,
    message: `Curriculum sync complete in ${elapsed}ms`,
    subjectsCreated,
    subjectsUpdated,
    subjectsMerged,
    chaptersCreated,
    chaptersUpdated,
    topicsCreated,
    topicsUpdated,
    topicsDeleted,
    chaptersDeleted,
    totalCurriculumRows: curriculum.length,
    totalSubjectGroups: subjectGroups.size,
  };

  console.log('🔄 Curriculum sync result:', result);

  return NextResponse.json(result);
}
