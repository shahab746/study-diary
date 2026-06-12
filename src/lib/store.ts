import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { localDB, localId } from '@/lib/local-db';

// ═══════════════════════════════════════════════
// Offline Mutation Queue
// ═══════════════════════════════════════════════

interface PendingMutation {
  id: string;
  type: 'progress' | 'pacing';
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
}

const MUTATION_QUEUE_KEY = 'study-diary-mutation-queue';

function loadQueue(): PendingMutation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(MUTATION_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveQueue(queue: PendingMutation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(MUTATION_QUEUE_KEY, JSON.stringify(queue));
  } catch { /* quota exceeded — drop oldest */ }
}

function enqueueMutation(mutation: PendingMutation): void {
  const queue = loadQueue();
  queue.push(mutation);
  saveQueue(queue);
}

function dequeueByPayload(type: string, matchFn: (m: PendingMutation) => boolean): void {
  const queue = loadQueue();
  const idx = queue.findIndex(m => m.type === type && matchFn(m));
  if (idx !== -1) {
    queue.splice(idx, 1);
    saveQueue(queue);
  }
}

function getQueueLength(): number {
  return loadQueue().length;
}

/** Replay all pending mutations when back online */
async function replayQueue(): Promise<number> {
  const queue = loadQueue();
  if (queue.length === 0) return 0;

  let replayed = 0;
  const toRemove: string[] = [];
  for (const mutation of queue) {
    try {
      if (mutation.type === 'progress') {
        const res = await fetch('/api/sync-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mutation.payload),
        });
        if (res.ok) {
          toRemove.push(mutation.id);
          replayed++;
        } else {
          mutation.retryCount = (mutation.retryCount || 0) + 1;
          if (mutation.retryCount >= 5) {
            toRemove.push(mutation.id);
          }
        }
      } else if (mutation.type === 'pacing') {
        toRemove.push(mutation.id);
        replayed++;
      }
    } catch {
      break;
    }
  }
  if (toRemove.length > 0) {
    saveQueue(queue.filter(m => !toRemove.includes(m.id)));
  }
  return replayed;
}

// Types
export interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  color: string;
  icon: string;
  totalTopics: number;
  completedTopics: number;
  progressPct: number;
  chapterCount?: number;
  isLocked?: boolean;
  freeTopicCount?: number;
  premiumTopicCount?: number;
  chapters: {
    id: string;
    number: number;
    name: string;
    totalTopics: number;
    completedTopics: number;
  }[];
}

export interface TodayTask {
  topicId: string;
  topicName: string;
  dayNumber: number;
  subjectName: string;
  subjectColor: string;
  chapterName: string;
  completed: boolean;
  videoLink: string;
  pdfLink: string;
  priority: 'high' | 'medium' | 'low';
  subjectIcon: string;
  duration: number;
}

export interface SpecialCourseItem {
  id: string;
  name: string;
  subject: string;
  topic: string;
  videoLink: string;
  pdfLink: string;
}

export interface PacingGoal {
  months: number;
  targetDate: string;
  topicsPerDay: number;
}

export interface PerformanceData {
  month: string;
  lectures: number;
}

export interface SubjectDetailTopic {
  id: string;
  number: number;
  name: string;
  videoLink: string;
  pdfLink: string;
  hasVideo: boolean;
  hasPdf: boolean;
  dayNumber: number;
  completed: boolean;
  isFree?: boolean;
}

export interface SubjectDetailChapter {
  id: string;
  number: number;
  name: string;
  topics: SubjectDetailTopic[];
  completedTopics: number;
  totalTopics: number;
}

export interface SubjectDetail {
  id: string;
  name: string;
  color: string;
  icon: string;
  grade: string;
  board: string;
  field: string;
  totalTopics: number;
  chapterCount: number;
  chapters: SubjectDetailChapter[];
  completedTopics: number;
  isFreeUser?: boolean;
}

type SidebarView = 'dashboard' | 'lectures' | 'calendar' | 'subjects' | 'insights' | 'search' | 'settings';

interface StudyOSState {
  // Data
  student: {
    name: string;
    phone: string;
    grade: number;
    board: string;
    field: string;
    startDate: string;
    targetDate: string;
    currentDay: number;
    totalDays: number;
    topicsDone: number;
    daysLeft: number;
    pacingGoal: string;
  } | null;
  subjects: SubjectProgress[];
  specialCourses: SpecialCourseItem[];
  todayTasks: TodayTask[];
  performanceData: PerformanceData[];
  pacingGoals: Record<string, PacingGoal>;
  totalTopics: number;
  totalCompleted: number;
  topicsPerDay: number;
  focusScore: number;
  streak: number;
  programWeek: number;
  weeksLeft: number;
  isFreeUser: boolean;

  // Subject Detail
  selectedSubjectId: string | null;
  subjectDetail: SubjectDetail | null;
  subjectDetailLoading: boolean;

  // UI State
  isLoading: boolean;
  activePacingGoal: string;
  syncing: boolean;
  expandedSubject: string | null;
  sidebarView: SidebarView;
  focusTimerActive: boolean;
  focusTimerMinutes: number;
  focusTimerOpen: boolean;
  highlightTopicId: string | null;

  // Sync tracking
  lastSynced: string | null;
  isOnline: boolean;
  pendingSyncCount: number;

  // Actions
  fetchData: (phone?: string) => Promise<void>;
  syncNow: () => Promise<void>;
  toggleTaskComplete: (topicId: string) => Promise<void>;
  setPacingGoal: (goal: string) => Promise<void>;
  setExpandedSubject: (subjectId: string | null) => void;
  openSubjectDetail: (subjectId: string) => Promise<void>;
  closeSubjectDetail: () => void;
  toggleSubjectDetailTopic: (topicId: string) => Promise<void>;
  setSidebarView: (view: SidebarView) => void;
  toggleFocusTimer: () => void;
  setFocusTimerOpen: (open: boolean) => void;
  setHighlightTopicId: (id: string | null) => void;
  _initNetworkListeners: () => (() => void) | void;
}

export const useStudyOS = create<StudyOSState>()(
  persist(
    (set, get) => ({
      // Initial data
      student: null,
      subjects: [],
      specialCourses: [],
      todayTasks: [],
      performanceData: [],
      pacingGoals: {},
      totalTopics: 539,
      totalCompleted: 0,
      topicsPerDay: 4,
      focusScore: 0,
      streak: 0,
      programWeek: 3,
      weeksLeft: 60,
      isLoading: true,
      activePacingGoal: '5M',
      syncing: false,
      expandedSubject: null,
      selectedSubjectId: null,
      subjectDetail: null,
      subjectDetailLoading: false,
      sidebarView: 'dashboard',
      focusTimerActive: false,
      focusTimerMinutes: 25,
      focusTimerOpen: false,
      highlightTopicId: null,
      isFreeUser: false,
      lastSynced: null,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      pendingSyncCount: 0,

      syncNow: async () => {
        const state = get();
        const phone = state.student?.phone || '';
        if (!phone) return;

        try {
          // Collect all local progress for this student
          const progress = await localDB.progress
            .where('studentPhone')
            .equals(phone)
            .toArray();

          if (progress.length === 0) return;

          const records = progress.map(p => ({
            topicId: p.topicId,
            completed: p.completed,
            dateCompleted: p.dateCompleted || '',
          }));

          const res = await fetch('/api/sync-progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, records }),
          });

          if (res.ok) {
            // Also replay any queued mutations
            const replayed = await replayQueue();
            set({
              lastSynced: new Date().toISOString(),
              pendingSyncCount: getQueueLength(),
            });
            console.log(`✅ Sync complete: ${records.length} progress records, ${replayed} queued mutations replayed`);
          }
        } catch (error) {
          console.warn('Sync failed (will retry later):', error);
        }
      },

      fetchData: async (phone?: string) => {
        // Clear old data first to prevent showing wrong user's data
        set({ 
          isLoading: true, 
          student: null,
          subjects: [],
          todayTasks: [],
          totalCompleted: 0,
          focusScore: 0,
          streak: 0,
        });
        try {
          // Fetch actual dashboard data from API (which reads from Google Sheets)
          const params = phone ? `?phone=${encodeURIComponent(phone)}` : '';
          const res = await fetch(`/api/data${params}`, { cache: 'no-store' });
          if (!res.ok) {
            const errText = await res.text().catch(() => 'Unknown error');
            console.error('Data API error:', res.status, errText);
            throw new Error(`Failed to fetch data: ${res.status}`);
          }
          const data = await res.json();
          
          if (data.error) {
            console.error('Data API returned error:', data.error);
            throw new Error(data.error);
          }
          
          set({
            student: data.student,
            subjects: data.subjects || [],
            specialCourses: data.specialCourses || [],
            todayTasks: data.todayTasks || [],
            performanceData: data.performanceData || [],
            pacingGoals: data.pacingGoals || {},
            totalTopics: data.totalTopics || 0,
            totalCompleted: data.totalCompleted || 0,
            topicsPerDay: data.topicsPerDay || 0,
            focusScore: data.focusScore || 0,
            streak: data.streak || 0,
            programWeek: data.programWeek || 3,
            weeksLeft: data.weeksLeft || 60,
            activePacingGoal: data.student?.pacingGoal || '5M',
            isFreeUser: data.isFreeUser || false,
            isLoading: false,
            lastSynced: new Date().toISOString(),
            isOnline: true,
            pendingSyncCount: getQueueLength(),
          });

          // ── Cache student profile into IndexedDB ──
          if (data.student?.phone) {
            try {
              await localDB.students.put({
                id: data.student.phone,
                name: data.student.name,
                phone: data.student.phone,
                grade: data.student.grade,
                board: data.student.board,
                field: data.student.field,
                status: data.student.status || 'free',
                startDate: data.student.startDate,
                targetDate: data.student.targetDate,
                currentDay: data.student.currentDay || 1,
                totalDays: data.student.totalDays || 0,
                topicsDone: data.student.topicsDone || 0,
                daysLeft: data.student.daysLeft || 0,
                pacingGoal: data.student.pacingGoal || '5M',
                pin: data.student.pin || '1234',
                academicGroup: data.student.academicGroup || '',
              });

              // Cache progress data from the API response
              if (data.todayTasks) {
                for (const task of data.todayTasks) {
                  if (task.completed && task.topicId) {
                    const existing = await localDB.progress
                      .where('[topicId+studentPhone]')
                      .equals([task.topicId, data.student.phone])
                      .first();
                    if (!existing) {
                      await localDB.progress.put({
                        id: localId(),
                        topicId: task.topicId,
                        studentPhone: data.student.phone,
                        completed: true,
                        dateCompleted: new Date().toISOString(),
                      });
                    }
                  }
                }
              }

              // Cache pacing goals
              if (data.pacingGoals && data.student.pacingGoal) {
                const goal = data.student.pacingGoal;
                const goalData = data.pacingGoals[goal];
                if (goalData) {
                  await localDB.pacingGoals.put({
                    id: data.student.phone,
                    goal,
                    targetDate: goalData.targetDate || '',
                    topicsPerDay: goalData.topicsPerDay || 4,
                    updatedAt: new Date().toISOString(),
                  });
                }
              }

              // Update sync meta
              await localDB.syncMeta.put({
                id: 'student',
                lastSynced: new Date().toISOString(),
                rowCount: 1,
              });
            } catch (idxErr) {
              console.warn('IndexedDB cache failed (non-critical):', idxErr);
            }
          }
        } catch (error) {
          console.error('Failed to fetch data:', error);
          set({ isLoading: false });
        }
      },

      toggleTaskComplete: async (topicId: string) => {
        const state = get();
        const phone = state.student?.phone || '';

        const task = state.todayTasks.find(t => t.topicId === topicId);
        const newCompleted = !task?.completed;

        // Optimistic UI update (instant)
        set({
          todayTasks: state.todayTasks.map(t =>
            t.topicId === topicId ? { ...t, completed: newCompleted } : t
          ),
          totalCompleted: newCompleted
            ? state.totalCompleted + 1
            : Math.max(0, state.totalCompleted - 1),
          syncing: true,
        });

        // Update focus score
        const updatedTasks = state.todayTasks.map(t =>
          t.topicId === topicId ? { ...t, completed: newCompleted } : t
        );
        const doneCount = updatedTasks.filter(t => t.completed).length;
        const focusScore = updatedTasks.length > 0 ? Math.round((doneCount / updatedTasks.length) * 100) : 0;
        set({ focusScore });

        const updatedSubjects = state.subjects.map(s => {
          const taskObj = state.todayTasks.find(t => t.topicId === topicId && t.subjectName === s.subjectName);
          if (taskObj) {
            const newCompletedCount = newCompleted ? s.completedTopics + 1 : Math.max(0, s.completedTopics - 1);
            return {
              ...s,
              completedTopics: newCompletedCount,
              progressPct: s.totalTopics > 0 ? Math.round((newCompletedCount / s.totalTopics) * 100) : 0,
            };
          }
          return s;
        });
        set({ subjects: updatedSubjects });

        // ── Write to IndexedDB ──
        try {
          const existing = await localDB.progress
            .where('[topicId+studentPhone]')
            .equals([topicId, phone])
            .first();

          if (existing) {
            await localDB.progress.update(existing.id, {
              completed: newCompleted,
              dateCompleted: newCompleted ? new Date().toISOString() : null,
            });
          } else {
            await localDB.progress.add({
              id: localId(),
              topicId,
              studentPhone: phone,
              completed: newCompleted,
              dateCompleted: newCompleted ? new Date().toISOString() : null,
            });
          }

          // Queue mutation for server sync
          const mutationId = localId();
          enqueueMutation({
            id: mutationId,
            type: 'progress',
            payload: { phone, records: [{ topicId, completed: newCompleted, dateCompleted: newCompleted ? new Date().toISOString() : '' }] },
            createdAt: new Date().toISOString(),
            retryCount: 0,
          });
          set({ pendingSyncCount: getQueueLength() });

          // If online, try immediate sync and dequeue on success
          if (navigator.onLine) {
            fetch('/api/sync-progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone, records: [{ topicId, completed: newCompleted, dateCompleted: newCompleted ? new Date().toISOString() : '' }] }),
            }).then(res => {
              if (res.ok) {
                // Dequeue this specific mutation
                const queue = loadQueue().filter(m => m.id !== mutationId);
                saveQueue(queue);
                set({ lastSynced: new Date().toISOString(), pendingSyncCount: getQueueLength() });
              }
            }).catch(() => {
              // Will be replayed later
            });
          }
        } catch (idxErr) {
          console.warn('IndexedDB write failed (non-critical):', idxErr);
        }

        set({ syncing: false });
      },

      setPacingGoal: async (goal: string) => {
        const state = get();
        const phone = state.student?.phone || '';

        const pacingInfo = state.pacingGoals[goal];
        set({
          activePacingGoal: goal,
          topicsPerDay: pacingInfo?.topicsPerDay || 4,
        });

        // ── Write pacing goal to IndexedDB ──
        try {
          await localDB.pacingGoals.put({
            id: phone,
            goal,
            targetDate: pacingInfo?.targetDate || new Date().toISOString().split('T')[0],
            topicsPerDay: pacingInfo?.topicsPerDay || 4,
            updatedAt: new Date().toISOString(),
          });

          // Queue mutation for server sync
          enqueueMutation({
            id: localId(),
            type: 'pacing',
            payload: { phone, goal, topicsPerDay: pacingInfo?.topicsPerDay || 4 },
            createdAt: new Date().toISOString(),
            retryCount: 0,
          });
          set({ pendingSyncCount: getQueueLength() });
        } catch (idxErr) {
          console.warn('IndexedDB pacing write failed (non-critical):', idxErr);
        }

        // Refresh tasks for new pacing
        get().fetchData();
      },

      setExpandedSubject: (subjectId: string | null) => {
        set({ expandedSubject: subjectId });
      },

      openSubjectDetail: async (subjectId: string) => {
        set({ selectedSubjectId: subjectId, subjectDetailLoading: true, subjectDetail: null });
        try {
          const state = get();
          const phone = state.student?.phone || '';
          const res = await fetch(`/api/subject/${subjectId}?phone=${encodeURIComponent(phone)}`);
          if (!res.ok) throw new Error('Failed to fetch subject detail');
          const data = await res.json();
          set({ subjectDetail: data, subjectDetailLoading: false });
        } catch (error) {
          console.error('Failed to fetch subject detail:', error);
          set({ subjectDetailLoading: false });
        }
      },

      closeSubjectDetail: () => {
        set({ selectedSubjectId: null, subjectDetail: null });
        get().fetchData();
      },

      toggleSubjectDetailTopic: async (topicId: string) => {
        const state = get();
        const phone = state.student?.phone || '';
        const detail = state.subjectDetail;

        if (!detail) return;

        // Block free users from toggling premium (locked) topics
        const isFreeUser = state.isFreeUser || detail.isFreeUser === true;
        if (isFreeUser) {
          for (const ch of detail.chapters) {
            const topic = ch.topics.find(t => t.id === topicId);
            if (topic && topic.isFree === false) {
              return; // Blocked — premium topic for free user
            }
          }
        }

        let currentCompleted = false;
        for (const ch of detail.chapters) {
          const topic = ch.topics.find(t => t.id === topicId);
          if (topic) {
            currentCompleted = topic.completed;
            break;
          }
        }
        const newCompleted = !currentCompleted;

        const updatedDetail = {
          ...detail,
          chapters: detail.chapters.map(ch => ({
            ...ch,
            topics: ch.topics.map(t =>
              t.id === topicId ? { ...t, completed: newCompleted } : t
            ),
            completedTopics: newCompleted
              ? ch.completedTopics + 1
              : Math.max(0, ch.completedTopics - 1),
          })),
          completedTopics: newCompleted
            ? detail.completedTopics + 1
            : Math.max(0, detail.completedTopics - 1),
        };

        set({ subjectDetail: updatedDetail });

        // ── Write to IndexedDB ──
        try {
          const existing = await localDB.progress
            .where('[topicId+studentPhone]')
            .equals([topicId, phone])
            .first();

          if (existing) {
            await localDB.progress.update(existing.id, {
              completed: newCompleted,
              dateCompleted: newCompleted ? new Date().toISOString() : null,
            });
          } else {
            await localDB.progress.add({
              id: localId(),
              topicId,
              studentPhone: phone,
              completed: newCompleted,
              dateCompleted: newCompleted ? new Date().toISOString() : null,
            });
          }

          // Queue mutation for server sync
          const mutationId2 = localId();
          enqueueMutation({
            id: mutationId2,
            type: 'progress',
            payload: { phone, records: [{ topicId, completed: newCompleted, dateCompleted: newCompleted ? new Date().toISOString() : '' }] },
            createdAt: new Date().toISOString(),
            retryCount: 0,
          });
          set({ pendingSyncCount: getQueueLength() });

          // If online, try immediate sync and dequeue on success
          if (navigator.onLine) {
            fetch('/api/sync-progress', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ phone, records: [{ topicId, completed: newCompleted, dateCompleted: newCompleted ? new Date().toISOString() : '' }] }),
            }).then(res => {
              if (res.ok) {
                const queue = loadQueue().filter(m => m.id !== mutationId2);
                saveQueue(queue);
                set({ lastSynced: new Date().toISOString(), pendingSyncCount: getQueueLength() });
              }
            }).catch(() => {});
          }
        } catch (idxErr) {
          console.warn('IndexedDB write failed (non-critical):', idxErr);
        }
      },

      setSidebarView: (view: SidebarView) => {
        set({ sidebarView: view, selectedSubjectId: null, subjectDetail: null });
      },

      toggleFocusTimer: () => {
        set(state => ({ focusTimerActive: !state.focusTimerActive }));
      },

      setFocusTimerOpen: (open: boolean) => {
        set({ focusTimerOpen: open });
      },

      setHighlightTopicId: (id: string | null) => {
        set({ highlightTopicId: id });
      },

      // Online/offline detection
      _initNetworkListeners: () => {
        if (typeof window === 'undefined') return;

        const handleOnline = () => {
          set({ isOnline: true });
          // Auto-replay queued mutations when coming back online
          replayQueue().then(replayed => {
            if (replayed > 0) {
              set({ pendingSyncCount: getQueueLength(), lastSynced: new Date().toISOString() });
              console.log(`✅ Back online: ${replayed} mutations replayed`);
            }
          });
        };

        const handleOffline = () => {
          set({ isOnline: false });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Return cleanup function
        return () => {
          window.removeEventListener('online', handleOnline);
          window.removeEventListener('offline', handleOffline);
        };
      },
    }),
    {
      name: 'study-os-storage',
      partialize: (state) => ({
        activePacingGoal: state.activePacingGoal,
      }),
    }
  )
);
