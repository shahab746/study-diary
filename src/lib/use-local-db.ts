'use client';

import { useCallback } from 'react';
import { localDB, localId, getCurrentPhone, type LocalProgress, type LocalPacingGoal } from '@/lib/local-db';

/**
 * useLocalDB — Hook for reading/writing student data to IndexedDB.
 * 
 * Phase 0: Foundation only. The app still uses the API for everything.
 * Phase 1 will swap progress/pacing writes to use these methods.
 * Phase 2 will swap data reads to use IndexedDB cache.
 */
export function useLocalDB() {

  // ═══════════════════════════════════════════════
  // PROGRESS OPERATIONS
  // ═══════════════════════════════════════════════

  /** Toggle a topic's completion status in IndexedDB */
  const toggleProgress = useCallback(async (topicId: string, completed: boolean): Promise<void> => {
    const phone = getCurrentPhone();
    if (!phone) return;

    const existing = await localDB.progress
      .where('[topicId+studentPhone]')
      .equals([topicId, phone])
      .first();

    if (existing) {
      await localDB.progress.update(existing.id, {
        completed,
        dateCompleted: completed ? new Date().toISOString() : null,
      });
    } else {
      await localDB.progress.add({
        id: localId(),
        topicId,
        studentPhone: phone,
        completed,
        dateCompleted: completed ? new Date().toISOString() : null,
      });
    }
  }, []);

  /** Get all progress records for the current student */
  const getProgress = useCallback(async (phone?: string): Promise<LocalProgress[]> => {
    const studentPhone = phone || getCurrentPhone();
    if (!studentPhone) return [];
    return localDB.progress
      .where('studentPhone')
      .equals(studentPhone)
      .toArray();
  }, []);

  /** Get a Set of completed topic IDs for the current student */
  const getCompletedTopicIds = useCallback(async (phone?: string): Promise<Set<string>> => {
    const records = await getProgress(phone);
    return new Set(
      records.filter(r => r.completed).map(r => r.topicId)
    );
  }, []);

  /** Count completed topics for the current student */
  const countCompleted = useCallback(async (phone?: string): Promise<number> => {
    const records = await getProgress(phone);
    return records.filter(r => r.completed).length;
  }, []);

  /** Bulk set progress (for sync/restore from Sheets backup) */
  const setProgress = useCallback(async (records: LocalProgress[]): Promise<void> => {
    const phone = getCurrentPhone();
    if (!phone) return;

    // Clear existing progress for this student, then add all
    await localDB.progress
      .where('studentPhone')
      .equals(phone)
      .delete();

    await localDB.progress.bulkAdd(
      records.map(r => ({
        ...r,
        id: r.id || localId(),
        studentPhone: phone,
      }))
    );
  }, []);

  // ═══════════════════════════════════════════════
  // PACING GOAL OPERATIONS
  // ═══════════════════════════════════════════════

  /** Save pacing goal to IndexedDB */
  const savePacingGoal = useCallback(async (goal: string, targetDate: string, topicsPerDay: number): Promise<void> => {
    const phone = getCurrentPhone();
    if (!phone) return;

    await localDB.pacingGoals.put({
      id: phone,
      goal,
      targetDate,
      topicsPerDay,
      updatedAt: new Date().toISOString(),
    });
  }, []);

  /** Get pacing goal from IndexedDB */
  const getPacingGoal = useCallback(async (phone?: string): Promise<LocalPacingGoal | undefined> => {
    const studentPhone = phone || getCurrentPhone();
    if (!studentPhone) return undefined;
    return localDB.pacingGoals.get(studentPhone);
  }, []);

  // ═══════════════════════════════════════════════
  // CURRICULUM CACHE OPERATIONS
  // ═══════════════════════════════════════════════

  /** Cache curriculum data from API response into IndexedDB */
  const cacheCurriculum = useCallback(async (data: {
    subjects: any[];
    chapters?: any[];
    topics?: any[];
    specialCourses?: any[];
  }): Promise<void> => {
    const { subjects = [], chapters = [], topics = [], specialCourses = [] } = data;

    // Use bulkPut for upsert behavior
    if (subjects.length > 0) await localDB.subjects.bulkPut(subjects);
    if (chapters.length > 0) await localDB.chapters.bulkPut(chapters);
    if (topics.length > 0) await localDB.topics.bulkPut(topics);
    if (specialCourses.length > 0) await localDB.specialCourses.bulkPut(specialCourses);

    // Update sync meta
    await localDB.syncMeta.put({
      id: 'curriculum',
      lastSynced: new Date().toISOString(),
      rowCount: subjects.length + chapters.length + topics.length,
    });
  }, []);

  /** Cache student profile in IndexedDB */
  const cacheStudent = useCallback(async (student: any): Promise<void> => {
    if (!student?.phone) return;
    await localDB.students.put({
      id: student.phone, // use phone as id for easy lookup
      name: student.name,
      phone: student.phone,
      grade: student.grade,
      board: student.board,
      field: student.field,
      status: student.status || 'free',
      startDate: student.startDate,
      targetDate: student.targetDate,
      currentDay: student.currentDay || 1,
      totalDays: student.totalDays || 0,
      topicsDone: student.topicsDone || 0,
      daysLeft: student.daysLeft || 0,
      pacingGoal: student.pacingGoal || '5M',
      pin: student.pin || '1234',
      academicGroup: student.academicGroup || '',
    });

    await localDB.syncMeta.put({
      id: 'student',
      lastSynced: new Date().toISOString(),
      rowCount: 1,
    });
  }, []);

  /** Get cached student from IndexedDB */
  const getCachedStudent = useCallback(async (phone: string): Promise<any | undefined> => {
    return localDB.students.where('phone').equals(phone).first();
  }, []);

  /** Check if curriculum data is cached and fresh (within TTL) */
  const isCurriculumCached = useCallback(async (ttlMinutes = 5): Promise<boolean> => {
    const meta = await localDB.syncMeta.get('curriculum');
    if (!meta) return false;
    const age = Date.now() - new Date(meta.lastSynced).getTime();
    return age < ttlMinutes * 60 * 1000;
  }, []);

  /** Get the last sync time for a table */
  const getLastSync = useCallback(async (table: string): Promise<string | null> => {
    const meta = await localDB.syncMeta.get(table);
    return meta?.lastSynced || null;
  }, []);

  // ═══════════════════════════════════════════════
  // EXPORT / IMPORT (for backup & restore)
  // ═══════════════════════════════════════════════

  /** Export all local data as JSON (for backup) */
  const exportData = useCallback(async (): Promise<string> => {
    const phone = getCurrentPhone();
    const data = {
      exportedAt: new Date().toISOString(),
      studentPhone: phone,
      progress: await localDB.progress.where('studentPhone').equals(phone || '').toArray(),
      pacingGoal: phone ? await localDB.pacingGoals.get(phone) : null,
    };
    return JSON.stringify(data, null, 2);
  }, []);

  /** Import progress data from JSON backup */
  const importData = useCallback(async (json: string): Promise<number> => {
    const data = JSON.parse(json);
    let imported = 0;

    if (data.progress && Array.isArray(data.progress)) {
      for (const record of data.progress) {
        await localDB.progress.put({
          ...record,
          id: record.id || localId(),
        });
        imported++;
      }
    }

    if (data.pacingGoal) {
      await localDB.pacingGoals.put(data.pacingGoal);
      imported++;
    }

    return imported;
  }, []);

  return {
    // Progress
    toggleProgress,
    getProgress,
    getCompletedTopicIds,
    countCompleted,
    setProgress,

    // Pacing
    savePacingGoal,
    getPacingGoal,

    // Curriculum cache
    cacheCurriculum,
    cacheStudent,
    getCachedStudent,
    isCurriculumCached,
    getLastSync,

    // Export/Import
    exportData,
    importData,
  };
}
