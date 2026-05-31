import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

  // UI State
  isLoading: boolean;
  activePacingGoal: string;
  syncing: boolean;
  expandedSubject: string | null;

  // Actions
  fetchData: () => Promise<void>;
  toggleTaskComplete: (topicId: string) => Promise<void>;
  setPacingGoal: (goal: string) => Promise<void>;
  setExpandedSubject: (subjectId: string | null) => void;
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
      isLoading: true,
      activePacingGoal: '5M',
      syncing: false,
      expandedSubject: null,

      fetchData: async () => {
        set({ isLoading: true });
        try {
          const res = await fetch('/api/data');
          if (!res.ok) throw new Error('Failed to fetch');
          const data = await res.json();
          set({
            student: data.student,
            subjects: data.subjects,
            specialCourses: data.specialCourses,
            todayTasks: data.todayTasks,
            performanceData: data.performanceData,
            pacingGoals: data.pacingGoals,
            totalTopics: data.totalTopics,
            totalCompleted: data.totalCompleted,
            topicsPerDay: data.topicsPerDay,
            activePacingGoal: data.student?.pacingGoal || '5M',
            isLoading: false,
          });
        } catch (error) {
          console.error('Failed to fetch data:', error);
          set({ isLoading: false });
        }
      },

      toggleTaskComplete: async (topicId: string) => {
        const state = get();
        const phone = state.student?.phone || '';

        // Optimistic update - immediately update UI
        const task = state.todayTasks.find(t => t.topicId === topicId);
        const newCompleted = !task?.completed;

        // Update today tasks optimistically
        set({
          todayTasks: state.todayTasks.map(t =>
            t.topicId === topicId ? { ...t, completed: newCompleted } : t
          ),
          totalCompleted: newCompleted
            ? state.totalCompleted + 1
            : Math.max(0, state.totalCompleted - 1),
          syncing: true,
        });

        // Update subject progress optimistically
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

        // Fire-and-forget to backend
        try {
          const res = await fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              topicId,
              studentPhone: phone,
              completed: newCompleted,
            }),
          });

          if (!res.ok) {
            // Revert on failure - show subtle toast
            console.warn('Sync failed, reverting optimistic update');
            set({
              todayTasks: state.todayTasks, // revert
              syncing: false,
            });
          } else {
            set({ syncing: false });
          }
        } catch {
          // Silent failure - unobtrusive notification
          set({ syncing: false });
        }
      },

      setPacingGoal: async (goal: string) => {
        const state = get();
        const phone = state.student?.phone || '';

        // Optimistic update
        const pacingInfo = state.pacingGoals[goal];
        set({
          activePacingGoal: goal,
          topicsPerDay: pacingInfo?.topicsPerDay || 4,
        });

        // Fire-and-forget
        try {
          const res = await fetch('/api/pacing', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pacingGoal: goal,
              studentPhone: phone,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            set({
              activePacingGoal: goal,
              topicsPerDay: data.topicsPerDay,
            });
          }
        } catch {
          // Silent failure
        }
      },

      setExpandedSubject: (subjectId: string | null) => {
        set({ expandedSubject: subjectId });
      },
    }),
    {
      name: 'study-os-storage',
      partialize: (state) => ({
        activePacingGoal: state.activePacingGoal,
        todayTasks: state.todayTasks,
        totalCompleted: state.totalCompleted,
      }),
    }
  )
);
