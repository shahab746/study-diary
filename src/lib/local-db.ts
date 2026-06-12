/**
 * Local Database — Dexie (IndexedDB) for offline-first data
 *
 * Provides client-side persistent storage for:
 * - Student profile cache
 * - Progress tracking (completed topics)
 * - Pacing goals
 * - Sync metadata
 */

import Dexie, { type Table } from 'dexie';

// ── Schema Types ──

export interface StudentRecord {
  id: string; // phone number
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
  topicsDone: number;
  daysLeft: number;
  pacingGoal: string;
  pin: string;
  academicGroup: string;
}

export interface ProgressRecord {
  id: string;
  topicId: string;
  studentPhone: string;
  completed: boolean;
  dateCompleted: string | null;
}

export interface PacingGoalRecord {
  id: string; // phone number
  goal: string;
  targetDate: string;
  topicsPerDay: number;
  updatedAt: string;
}

export interface SyncMetaRecord {
  id: string;
  lastSynced: string;
  rowCount: number;
}

// ── Database Class ──

class StudyDiaryDB extends Dexie {
  students!: Table<StudentRecord, string>;
  progress!: Table<ProgressRecord, string>;
  pacingGoals!: Table<PacingGoalRecord, string>;
  syncMeta!: Table<SyncMetaRecord, string>;

  constructor() {
    super('StudyDiaryDB');

    this.version(1).stores({
      students: 'id, phone',
      progress: 'id, topicId, studentPhone, [topicId+studentPhone]',
      pacingGoals: 'id',
      syncMeta: 'id',
    });
  }
}

// ── Singleton ──

export const localDB = new StudyDiaryDB();

/** Generate a unique local ID */
export function localId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;
}
