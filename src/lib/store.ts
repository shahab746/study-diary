import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { localDB, localId } from '@/lib/local-db';

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

  // Actions
  fetchData: (phone?: string) => Promise<void>;
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
          // NOTE: Removed fire-and-forget sync calls — they add unnecessary 
          // latency on every page load. Data should be seeded via /api/seed 
          // endpoint once, then fetched directly from the DB.

          // Fetch actual dashboard data immediately
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
          });

          // ── Phase 1: Cache student profile into IndexedDB ──
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
              // The API returns progress data embedded in subjects & tasks
              // We extract completed topic IDs and store them
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

        // ── Phase 1: Write to IndexedDB FIRST (instant, survives offline) ──
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
        } catch (idxErr) {
          console.warn('IndexedDB write failed (non-critical):', idxErr);
        }

        // ── Then sync to API in background (for Turso, will be removed in Phase 5) ──
        try {
          const res = await fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topicId, studentPhone: phone, completed: newCompleted }),
          });

          if (!res.ok) {
            console.warn('API sync failed — progress saved locally in IndexedDB');
          }
        } catch {
          console.warn('API sync failed — progress saved locally in IndexedDB');
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

        // ── Phase 1: Write pacing goal to IndexedDB FIRST ──
        try {
          await localDB.pacingGoals.put({
            id: phone,
            goal,
            targetDate: pacingInfo?.targetDate || new Date().toISOString().split('T')[0],
            topicsPerDay: pacingInfo?.topicsPerDay || 4,
            updatedAt: new Date().toISOString(),
          });
        } catch (idxErr) {
          console.warn('IndexedDB pacing write failed (non-critical):', idxErr);
        }

        // ── Then sync to API in background ──
        try {
          const res = await fetch('/api/pacing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pacingGoal: goal, studentPhone: phone }),
          });

          if (res.ok) {
            const data = await res.json();
            set({ activePacingGoal: goal, topicsPerDay: data.topicsPerDay });
            // Refresh tasks for new pacing
            get().fetchData();
          }
        } catch {
          console.warn('API sync failed — pacing goal saved locally in IndexedDB');
        }
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

        // ── Phase 1: Write to IndexedDB FIRST ──
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
        } catch (idxErr) {
          console.warn('IndexedDB write failed (non-critical):', idxErr);
        }

        // ── Then sync to API in background ──
        try {
          await fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topicId, studentPhone: phone, completed: newCompleted }),
          });
        } catch {
          console.warn('API sync failed — progress saved locally in IndexedDB');
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
    }),
    {
      name: 'study-os-storage',
      partialize: (state) => ({
        activePacingGoal: state.activePacingGoal,
      }),
    }
  )
);
