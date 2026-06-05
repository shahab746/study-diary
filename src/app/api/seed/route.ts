import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchUsersFromSheet, fetchCurriculumFromSheet, invalidateCache } from '@/lib/sheet-sync';

/**
 * Seed endpoint — populates Turso database from Google Sheets.
 * Call this once after deploying to Vercel to populate the empty Turso database.
 *
 * GET /api/seed          — Syncs users + curriculum
 * GET /api/seed?type=users       — Syncs users only
 * GET /api/seed?type=curriculum  — Syncs curriculum only
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'full';

    const results: Record<string, unknown> = { timestamp: new Date().toISOString() };

    if (type === 'users' || type === 'full') {
      results.users = await seedUsers();
    }

    if (type === 'curriculum' || type === 'full') {
      results.curriculum = await seedCurriculum();
    }

    // Invalidate cache so fresh data is served
    invalidateCache();

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

async function seedUsers() {
  console.log('🌱 Seeding users from Google Sheets...');
  const sheetUsers = await fetchUsersFromSheet(true);

  if (sheetUsers.length === 0) {
    return { status: 'no_users_found', message: 'No users found in Google Sheet. Make sure the sheet is publicly accessible.' };
  }

  let synced = 0;
  let updated = 0;
  let errors = 0;

  for (const su of sheetUsers) {
    try {
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
        pin: su.pin || '1234',
        academicGroup: su.academicGroup || '',
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
    } catch (err) {
      console.error(`🌱 Error syncing user ${su.phone}:`, err);
      errors++;
    }
  }

  return { synced, updated, errors, totalInSheet: sheetUsers.length };
}

async function seedCurriculum() {
  console.log('🌱 Seeding curriculum from Google Sheets...');
  const curriculum = await fetchCurriculumFromSheet(true);

  if (curriculum.length === 0) {
    return { status: 'no_curriculum_found', message: 'No curriculum data found in Google Sheet.' };
  }

  // Subject styling
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

  // Group by subject-grade
  const subjectGroups = new Map<string, typeof curriculum>();
  for (const row of curriculum) {
    const key = `${row.subject}|||${row.grade}`;
    if (!subjectGroups.has(key)) subjectGroups.set(key, []);
    subjectGroups.get(key)!.push(row);
  }

  let subjectsCreated = 0;
  let subjectsUpdated = 0;
  let chaptersCreated = 0;
  let topicsCreated = 0;
  let errors = 0;

  for (const [subjectKey, rows] of subjectGroups) {
    try {
      const [subjectName, grade] = subjectKey.split('|||');
      const firstRow = rows[0];
      const board = firstRow.board || 'BISE Abbottabad';
      const field = firstRow.field || 'Science';
      const styling = SUBJECT_STYLING[subjectName] || { color: 'Gray', icon: '📚', order: 99 };

      const chapterGroups = new Map<string, typeof curriculum>();
      for (const row of rows) {
        const chKey = `${row.chapterNo}|||${row.chapterName}`;
        if (!chapterGroups.has(chKey)) chapterGroups.set(chKey, []);
        chapterGroups.get(chKey)!.push(row);
      }

      const totalTopics = rows.length;
      const totalChapters = chapterGroups.size;

      // Find or create subject
      let subject = await db.subject.findFirst({
        where: { name: subjectName, grade: grade.startsWith('Grade') ? grade : `Grade ${grade}` },
      });

      if (subject) {
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
        });
        subjectsCreated++;
      }

      // Create chapters and topics
      for (const [chapterKey, chapterRows] of chapterGroups) {
        const [chapterNoStr, chapterName] = chapterKey.split('|||');
        const chapterNo = parseInt(chapterNoStr) || 0;

        // Find or create chapter
        const chapters = await db.chapter.findMany({
          where: { subjectId: subject.id },
        });
        let chapter = chapters.find((ch: any) => ch.number === chapterNo);

        if (!chapter) {
          chapter = await db.chapter.create({
            data: {
              subjectId: subject.id,
              number: chapterNo,
              name: chapterName,
            },
          });
          chaptersCreated++;
        }

        // Create topics
        for (const row of chapterRows) {
          const existingTopics = await db.topic.findMany({
            where: { chapterId: chapter.id },
          });
          const existingTopic = existingTopics.find((t: any) => t.number === row.topicNo);

          if (!existingTopic) {
            await db.topic.create({
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
            topicsCreated++;
          }
        }
      }
    } catch (err) {
      console.error(`🌱 Error seeding subject ${subjectKey}:`, err);
      errors++;
    }
  }

  return {
    subjectsCreated,
    subjectsUpdated,
    chaptersCreated,
    topicsCreated,
    errors,
    totalCurriculumRows: curriculum.length,
    totalSubjectGroups: subjectGroups.size,
  };
}
