import { db } from '@/lib/db';
import { fetchUsersFromSheet, fetchCurriculumFromSheet } from '@/lib/sheet-sync';
import { NextResponse } from 'next/server';

/**
 * Sync users from Google Sheets to the local database
 * This should be called periodically or on-demand to keep the DB in sync
 * 
 * GET /api/sync?type=users  — Sync users
 * GET /api/sync?type=subjects — Sync subject eligibility from Curriculum sheet
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get('type') || 'users';

    if (type === 'users') {
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

      return NextResponse.json({
        success: true,
        message: `Synced ${synced} new users, updated ${updated} existing users`,
        total: sheetUsers.length,
      });
    }

    if (type === 'subjects') {
      const curriculum = await fetchCurriculumFromSheet(true);
      
      // Get unique subject-grade-eligibility mappings
      const subjectMap = new Map<string, { groupEligibility: string }>();
      for (const row of curriculum) {
        const key = `${row.subject}-${row.grade}`;
        if (!subjectMap.has(key)) {
          subjectMap.set(key, { groupEligibility: row.groupEligibility || 'Both' });
        }
      }

      // Update subjects in database
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

    return NextResponse.json({ error: 'Invalid sync type. Use "users" or "subjects"' }, { status: 400 });
  } catch (error) {
    console.error('Sync error:', error);
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 });
  }
}
