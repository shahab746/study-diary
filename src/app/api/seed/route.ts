import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchUsersFromSheet, fetchCurriculumFromSheet, invalidateCache } from '@/lib/sheet-sync';

/**
 * Seed endpoint — populates Turso database from Google Sheets.
 * Uses DIRECT batch SQL for curriculum (1000+ rows) to avoid Vercel's 10s timeout.
 *
 * GET /api/seed              — Syncs users + curriculum
 * GET /api/seed?type=users   — Syncs users only
 * GET /api/seed?type=curriculum — Syncs curriculum only
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
      results.curriculum = await seedCurriculumFast();
    }

    invalidateCache();

    return NextResponse.json({ success: true, ...results });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined,
      },
      { status: 500 }
    );
  }
}

// ─── Users (only 3, individual queries are fine) ──────────────────────────────

async function seedUsers() {
  console.log('🌱 Seeding users from Google Sheets...');
  const sheetUsers = await fetchUsersFromSheet(true);

  if (sheetUsers.length === 0) {
    return { status: 'no_users_found', message: 'No users found in Google Sheet.' };
  }

  let synced = 0;
  let updated = 0;
  let errors = 0;
  const errorDetails: string[] = [];

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
        await db.student.update({ where: { phone: su.phone }, data });
        updated++;
      } else {
        await db.student.create({ data });
        synced++;
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      errorDetails.push(`User ${su.phone}: ${errMsg}`);
      errors++;
    }
  }

  return { synced, updated, errors, totalInSheet: sheetUsers.length, errorDetails: errors > 0 ? errorDetails : undefined };
}

// ─── Curriculum (FAST: uses direct batch SQL to avoid timeout) ────────────────

async function seedCurriculumFast() {
  console.log('🌱 Seeding curriculum (FAST batch mode)...');
  const startTime = Date.now();

  const curriculum = await fetchCurriculumFromSheet(true);

  if (curriculum.length === 0) {
    return { status: 'no_curriculum_found', message: 'No curriculum data found in Google Sheet.' };
  }

  // Get direct Turso client for batch operations
  const isTurso = !!process.env.LIBSQL_URL;

  if (!isTurso) {
    // Local dev: use the db proxy (no timeout issues locally)
    return seedCurriculumViaDbProxy(curriculum);
  }

  // ─── TURSO: Use direct batch SQL ──────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createClient } = require('@libsql/client') as typeof import('@libsql/client');
  const client = createClient({
    url: process.env.LIBSQL_URL!,
    authToken: process.env.LIBSQL_AUTH_TOKEN || undefined,
  });

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

  // Escape SQL string values
  function esc(val: any): string {
    if (val === null || val === undefined) return "''"
    const s = String(val).replace(/'/g, "''")
    return `'${s}'`
  }

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
  const errorDetails: string[] = [];

  // Step 1: Create all subjects in one batch
  const subjectIdMap = new Map<string, string>(); // "subjectName||grade" -> id

  // First, check which subjects already exist
  const existingSubjects = await client.execute('SELECT id, name, grade FROM Subject');
  for (const row of existingSubjects.rows) {
    const key = `${(row as any).name}|||${(row as any).grade}`;
    subjectIdMap.set(key, (row as any).id as string);
  }

  for (const [subjectKey, rows] of subjectGroups) {
    try {
      const [subjectName, grade] = subjectKey.split('|||');
      const firstRow = rows[0];
      const board = firstRow.board || 'BISE Abbottabad';
      const field = firstRow.field || 'Science';
      const styling = SUBJECT_STYLING[subjectName] || { color: 'Gray', icon: '📚', order: 99 };
      const gradeDisplay = grade.startsWith('Grade') ? grade : `Grade ${grade}`;

      const chapterGroups = new Map<string, typeof curriculum>();
      for (const row of rows) {
        const chKey = `${row.chapterNo}|||${row.chapterName}`;
        if (!chapterGroups.has(chKey)) chapterGroups.set(chKey, []);
        chapterGroups.get(chKey)!.push(row);
      }

      const totalTopics = rows.length;
      const totalChapters = chapterGroups.size;

      const existingId = subjectIdMap.get(`${subjectName}|||${gradeDisplay}`);

      let subjectId: string;
      if (existingId) {
        // Update existing subject
        await client.execute({
          sql: `UPDATE Subject SET "totalTopics" = ?, "chapterCount" = ?, color = ?, icon = ?, board = ?, field = ?, "groupEligibility" = ? WHERE id = ?`,
          args: [totalTopics, totalChapters, styling.color, styling.icon, board, field, firstRow.groupEligibility || 'Both', existingId],
        });
        subjectId = existingId;
        subjectsUpdated++;
      } else {
        // Create new subject
        subjectId = `subj_${subjectName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${grade}_${Date.now()}`;
        await client.execute({
          sql: `INSERT INTO Subject (id, name, grade, board, field, "totalTopics", "chapterCount", color, icon, "order", "groupEligibility") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [subjectId, subjectName, gradeDisplay, board, field, totalTopics, totalChapters, styling.color, styling.icon, styling.order, firstRow.groupEligibility || 'Both'],
        });
        subjectsCreated++;
      }

      subjectIdMap.set(subjectKey, subjectId);

      // Step 2: Create chapters for this subject (batch)
      // Check existing chapters
      const existingChapters = await client.execute({ sql: 'SELECT id, number FROM Chapter WHERE subjectId = ?', args: [subjectId] });
      const chapterIdMap = new Map<number, string>();
      for (const ch of existingChapters.rows) {
        chapterIdMap.set((ch as any).number as number, (ch as any).id as string);
      }

      for (const [chapterKey, chapterRows] of chapterGroups) {
        const [chapterNoStr, chapterName] = chapterKey.split('|||');
        const chapterNo = parseInt(chapterNoStr) || 0;
        const existingChId = chapterIdMap.get(chapterNo);

        let chapterId: string;
        if (existingChId) {
          chapterId = existingChId;
        } else {
          chapterId = `ch_${subjectId}_${chapterNo}`;
          await client.execute({
            sql: `INSERT INTO Chapter (id, subjectId, number, name) VALUES (?, ?, ?, ?)`,
            args: [chapterId, subjectId, chapterNo, chapterName],
          });
          chaptersCreated++;
        }

        // Step 3: Create topics for this chapter (batch via executeMultiple)
        // Check existing topics
        const existingTopics = await client.execute({ sql: 'SELECT number FROM Topic WHERE chapterId = ?', args: [chapterId] });
        const existingTopicNumbers = new Set((existingTopics.rows as any[]).map(r => r.number as number));

        const topicInserts: string[] = [];
        for (const row of chapterRows) {
          if (!existingTopicNumbers.has(row.topicNo)) {
            const topicId = `topic_${chapterId}_${row.topicNo}`;
            const isFree = row.isFree ? 1 : 0;
            topicInserts.push(
              `INSERT INTO Topic (id, chapterId, number, name, videoLink, pdfLink, isFree, dayNumber) VALUES (${esc(topicId)}, ${esc(chapterId)}, ${row.topicNo}, ${esc(row.topicName)}, ${esc(row.videoLink || '')}, ${esc(row.pdfLink || '')}, ${isFree}, ${row.totalDays || 0})`
            );
            topicsCreated++;
          }
        }

        // Send all topic inserts for this chapter as one batch
        if (topicInserts.length > 0) {
          const batchSql = topicInserts.join(';\n');
          await client.executeMultiple(batchSql);
        }
      }
    } catch (err) {
      console.error(`🌱 Error seeding subject ${subjectKey}:`, err);
      const errMsg = err instanceof Error ? err.message : String(err);
      errorDetails.push(`Subject ${subjectKey}: ${errMsg}`);
      errors++;
    }
  }

  client.close();

  const elapsed = Date.now() - startTime;
  console.log(`🌱 Curriculum seed completed in ${elapsed}ms`);

  return {
    subjectsCreated,
    subjectsUpdated,
    chaptersCreated,
    topicsCreated,
    errors,
    elapsedMs: elapsed,
    totalCurriculumRows: curriculum.length,
    totalSubjectGroups: subjectGroups.size,
    errorDetails: errors > 0 ? errorDetails : undefined,
  };
}

// ─── Fallback: Local dev uses db proxy ────────────────────────────────────────

async function seedCurriculumViaDbProxy(curriculum: any[]) {
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

  const subjectGroups = new Map<string, any[]>();
  for (const row of curriculum) {
    const key = `${row.subject}|||${row.grade}`;
    if (!subjectGroups.has(key)) subjectGroups.set(key, []);
    subjectGroups.get(key)!.push(row);
  }

  let subjectsCreated = 0, subjectsUpdated = 0, chaptersCreated = 0, topicsCreated = 0, errors = 0;

  for (const [subjectKey, rows] of subjectGroups) {
    try {
      const [subjectName, grade] = subjectKey.split('|||');
      const firstRow = rows[0];
      const board = firstRow.board || 'BISE Abbottabad';
      const field = firstRow.field || 'Science';
      const styling = SUBJECT_STYLING[subjectName] || { color: 'Gray', icon: '📚', order: 99 };

      const chapterGroups = new Map<string, any[]>();
      for (const row of rows) {
        const chKey = `${row.chapterNo}|||${row.chapterName}`;
        if (!chapterGroups.has(chKey)) chapterGroups.set(chKey, []);
        chapterGroups.get(chKey)!.push(row);
      }

      let subject = await db.subject.findFirst({
        where: { name: subjectName, grade: grade.startsWith('Grade') ? grade : `Grade ${grade}` },
      });

      if (subject) {
        await db.subject.update({
          where: { id: subject.id },
          data: { totalTopics: rows.length, chapterCount: chapterGroups.size, color: styling.color, icon: styling.icon, board, field, groupEligibility: firstRow.groupEligibility || 'Both' },
        });
        subjectsUpdated++;
      } else {
        subject = await db.subject.create({
          data: { name: subjectName, grade: grade.startsWith('Grade') ? grade : `Grade ${grade}`, board, field, totalTopics: rows.length, chapterCount: chapterGroups.size, color: styling.color, icon: styling.icon, order: styling.order, groupEligibility: firstRow.groupEligibility || 'Both' },
        });
        subjectsCreated++;
      }

      for (const [chapterKey, chapterRows] of chapterGroups) {
        const [chapterNoStr, chapterName] = chapterKey.split('|||');
        const chapterNo = parseInt(chapterNoStr) || 0;

        const chapters = await db.chapter.findMany({ where: { subjectId: subject.id } });
        let chapter = chapters.find((ch: any) => ch.number === chapterNo);

        if (!chapter) {
          chapter = await db.chapter.create({ data: { subjectId: subject.id, number: chapterNo, name: chapterName } });
          chaptersCreated++;
        }

        for (const row of chapterRows) {
          const existingTopics = await db.topic.findMany({ where: { chapterId: chapter.id } });
          const existingTopic = existingTopics.find((t: any) => t.number === row.topicNo);
          if (!existingTopic) {
            await db.topic.create({ data: { chapterId: chapter.id, number: row.topicNo, name: row.topicName, videoLink: row.videoLink || '', pdfLink: row.pdfLink || '', isFree: row.isFree, dayNumber: row.totalDays || 0 } });
            topicsCreated++;
          }
        }
      }
    } catch (err) {
      errors++;
    }
  }

  return { subjectsCreated, subjectsUpdated, chaptersCreated, topicsCreated, errors, totalCurriculumRows: curriculum.length };
}
