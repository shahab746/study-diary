'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import {
  Home as HomeIcon, ListTodo, BookOpen, CalendarDays, Timer, Download, Moon, Sun,
  Search, Plus, Star, Clock, Play, MoreHorizontal, X, ChevronLeft,
  Check, Flame, RotateCcw, Sigma, Cpu, Zap, BookOpenText, ArrowLeft,
  FileText, Menu
} from 'lucide-react';

// ============================================
// TYPES
// ============================================
type ViewId = 'today' | 'tasks' | 'courses' | 'schedule' | 'focus-timer' | 'export';

interface Course {
  id: string;
  name: string;
  instructor: string;
  color: string;
  totalLectures: number;
  completedLectures: number;
  semester: number;
  icon: React.ReactNode;
}

interface Task {
  id: string;
  title: string;
  courseName: string;
  courseId: string;
  lectureNum: number;
  priority: 'high' | 'medium' | 'low';
  duration: number;
  completed: boolean;
  color: string;
  instructor: string;
}

interface WeekSchedule {
  id: number;
  weekNum: number;
  dateRange: string;
  courses: { name: string; lectures: string; color: string }[];
  completed: boolean;
}

interface Lecture {
  id: string;
  number: number;
  title: string;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  completed: boolean;
  notes: string;
}

// ============================================
// MOCK DATA
// ============================================
const COURSES: Course[] = [
  { id: 'calc1', name: 'Calculus 1', instructor: 'Prof. Leonard', color: '#8B5CF6', totalLectures: 36, completedLectures: 0, semester: 1, icon: <Sigma width={20} height={20} /> },
  { id: 'prog1', name: 'Programming 1', instructor: 'MIT 6.0001', color: '#3B82F6', totalLectures: 22, completedLectures: 0, semester: 1, icon: <Cpu width={20} height={20} /> },
  { id: 'circuits', name: 'Circuits', instructor: 'MIT 6.002', color: '#F59E0B', totalLectures: 30, completedLectures: 0, semester: 1, icon: <Zap width={20} height={20} /> },
  { id: 'nand2tetris', name: 'Nand2Tetris', instructor: 'N2T', color: '#EF4444', totalLectures: 12, completedLectures: 0, semester: 1, icon: <Cpu width={20} height={20} /> },
  { id: 'linear', name: 'Linear Algebra', instructor: 'Prof. Leonard', color: '#10B981', totalLectures: 34, completedLectures: 0, semester: 2, icon: <Sigma width={20} height={20} /> },
  { id: 'prog2', name: 'Programming 2', instructor: 'MIT 6.0002', color: '#3B82F6', totalLectures: 20, completedLectures: 0, semester: 2, icon: <BookOpen width={20} height={20} /> },
  { id: 'signals', name: 'Signals Intro', instructor: 'MIT 6.003', color: '#EC4899', totalLectures: 20, completedLectures: 0, semester: 2, icon: <Zap width={20} height={20} /> },
];

const INITIAL_TASKS: Task[] = [
  { id: 't1', title: 'Lines, Angle of Inclination & Distance Formula', courseName: 'Calculus 1', courseId: 'calc1', lectureNum: 1, priority: 'high', duration: 65, completed: false, color: '#8B5CF6', instructor: 'Prof. Leonard' },
  { id: 't2', title: 'What is Computation?', courseName: 'Programming 1', courseId: 'prog1', lectureNum: 1, priority: 'medium', duration: 65, completed: false, color: '#3B82F6', instructor: 'MIT 6.0001' },
  { id: 't3', title: 'Introduction and Lumped Abstraction', courseName: 'Circuits', courseId: 'circuits', lectureNum: 1, priority: 'low', duration: 65, completed: false, color: '#F59E0B', instructor: 'MIT 6.002' },
  { id: 't4', title: 'Boolean Logic', courseName: 'Nand2Tetris', courseId: 'nand2tetris', lectureNum: 1, priority: 'low', duration: 65, completed: false, color: '#EF4444', instructor: 'N2T' },
];

const SCHEDULE_WEEKS: WeekSchedule[] = [
  { id: 1, weekNum: 1, dateRange: 'May 5 - May 11', courses: [
    { name: 'Calculus 1', lectures: 'L1-3', color: '#8B5CF6' },
    { name: 'Programming 1', lectures: 'L1-2', color: '#3B82F6' },
    { name: 'Circuits', lectures: 'L1-3', color: '#F59E0B' },
    { name: 'Nand2Tetris', lectures: 'L1-1', color: '#EF4444' },
  ], completed: false },
  { id: 2, weekNum: 2, dateRange: 'May 12 - May 18', courses: [
    { name: 'Calculus 1', lectures: 'L4-7', color: '#8B5CF6' },
    { name: 'Programming 1', lectures: 'L3-4', color: '#3B82F6' },
    { name: 'Circuits', lectures: 'L4-6', color: '#F59E0B' },
    { name: 'Nand2Tetris', lectures: 'L2-2', color: '#EF4444' },
  ], completed: false },
  { id: 3, weekNum: 3, dateRange: 'May 19 - May 25', courses: [
    { name: 'Calculus 1', lectures: 'L8-11', color: '#8B5CF6' },
    { name: 'Programming 1', lectures: 'L5-6', color: '#3B82F6' },
    { name: 'Circuits', lectures: 'L7-9', color: '#F59E0B' },
    { name: 'Nand2Tetris', lectures: 'L3-3', color: '#EF4444' },
  ], completed: false },
  { id: 4, weekNum: 4, dateRange: 'May 26 - Jun 1', courses: [
    { name: 'Calculus 1', lectures: 'L12-15', color: '#8B5CF6' },
    { name: 'Programming 1', lectures: 'L7-8', color: '#3B82F6' },
    { name: 'Circuits', lectures: 'L10-12', color: '#F59E0B' },
    { name: 'Nand2Tetris', lectures: 'L4-4', color: '#EF4444' },
  ], completed: false },
  { id: 5, weekNum: 5, dateRange: 'Jun 2 - Jun 8', courses: [
    { name: 'Calculus 1', lectures: 'L16-19', color: '#8B5CF6' },
    { name: 'Programming 1', lectures: 'L9-10', color: '#3B82F6' },
    { name: 'Circuits', lectures: 'L13-15', color: '#F59E0B' },
    { name: 'Nand2Tetris', lectures: 'L5-5', color: '#EF4444' },
  ], completed: false },
  { id: 6, weekNum: 6, dateRange: 'Jun 9 - Jun 15', courses: [
    { name: 'Calculus 1', lectures: 'L20-23', color: '#8B5CF6' },
    { name: 'Programming 1', lectures: 'L11-12', color: '#3B82F6' },
    { name: 'Circuits', lectures: 'L16-18', color: '#F59E0B' },
    { name: 'Nand2Tetris', lectures: 'L6-6', color: '#EF4444' },
  ], completed: false },
  { id: 7, weekNum: 7, dateRange: 'Jun 16 - Jun 22', courses: [
    { name: 'Calculus 1', lectures: 'L24-27', color: '#8B5CF6' },
    { name: 'Programming 1', lectures: 'L13-14', color: '#3B82F6' },
    { name: 'Circuits', lectures: 'L19-21', color: '#F59E0B' },
    { name: 'Nand2Tetris', lectures: 'L7-7', color: '#EF4444' },
  ], completed: false },
  { id: 8, weekNum: 8, dateRange: 'Jun 23 - Jun 29', courses: [
    { name: 'Calculus 1', lectures: 'L28-31', color: '#8B5CF6' },
    { name: 'Programming 1', lectures: 'L15-16', color: '#3B82F6' },
    { name: 'Circuits', lectures: 'L22-24', color: '#F59E0B' },
    { name: 'Nand2Tetris', lectures: 'L8-8', color: '#EF4444' },
  ], completed: false },
  { id: 9, weekNum: 9, dateRange: 'Jun 30 - Jul 6', courses: [
    { name: 'Calculus 1', lectures: 'L32-36', color: '#8B5CF6' },
    { name: 'Programming 1', lectures: 'L17-22', color: '#3B82F6' },
    { name: 'Circuits', lectures: 'L25-30', color: '#F59E0B' },
    { name: 'Nand2Tetris', lectures: 'L9-12', color: '#EF4444' },
  ], completed: false },
];

const CALCULUS_LECTURES: Lecture[] = [
  { id: 'cl1', number: 1, title: 'Lines, Angle of Inclination & Distance Formula', difficulty: 'easy', completed: false, notes: '' },
  { id: 'cl2', number: 2, title: 'Functions, Domain & Range', difficulty: 'easy', completed: false, notes: '' },
  { id: 'cl3', number: 3, title: 'Trigonometric Functions Review', difficulty: 'medium', completed: false, notes: '' },
  { id: 'cl4', number: 4, title: 'Introduction to Limits', difficulty: 'medium', completed: false, notes: '' },
  { id: 'cl5', number: 5, title: 'Properties of Limits & Limit Laws', difficulty: 'hard', completed: false, notes: '' },
  { id: 'cl6', number: 6, title: 'Continuity & One-Sided Limits', difficulty: 'hard', completed: false, notes: '' },
  { id: 'cl7', number: 7, title: 'Limits at Infinity & Infinite Limits', difficulty: 'hard', completed: false, notes: '' },
];

// ============================================
// HELPERS
// ============================================
const PRIORITY_COLORS = { high: '#FF3B30', medium: '#3B82F6', low: '#FF9500' };
const PRIORITY_LABELS = { high: 'HIGH PRIORITY', medium: 'MEDIUM PRIORITY', low: 'LOW PRIORITY' };

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getDateLine(): string {
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const now = new Date();
  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
}

function formatTimer(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ============================================
// SIDEBAR COMPONENT
// ============================================
function Sidebar({ currentView, setCurrentView, onClose }: {
  currentView: ViewId;
  setCurrentView: (v: ViewId) => void;
  onClose?: () => void;
}) {
  const { theme, setTheme } = useTheme();

  const navItems: { id: ViewId; label: string; icon: React.ReactNode }[] = [
    { id: 'today', label: 'Today', icon: <HomeIcon width={18} height={18} /> },
    { id: 'tasks', label: 'Tasks', icon: <ListTodo width={18} height={18} /> },
    { id: 'courses', label: 'Courses', icon: <BookOpen width={18} height={18} /> },
    { id: 'schedule', label: 'Schedule', icon: <CalendarDays width={18} height={18} /> },
  ];

  const bottomItems: { id: ViewId; label: string; icon: React.ReactNode }[] = [
    { id: 'focus-timer', label: 'Focus timer', icon: <Timer width={18} height={18} /> },
    { id: 'export', label: 'Export notes', icon: <Download width={18} height={18} /> },
  ];

  const handleNav = (id: ViewId) => {
    setCurrentView(id);
    onClose?.();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <BookOpenText width={22} height={22} style={{ color: '#FF3B30' }} />
        <div>
          <h1 className="heading">Student&apos;s Diary</h1>
          <span>Shahab · 176 Lec</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {navItems.map(item => (
          <div
            key={item.id}
            className={`sidebar-nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => handleNav(item.id)}
          >
            {item.icon}
            {item.label}
          </div>
        ))}
      </nav>

      <div className="sidebar-section-label">Tools</div>
      <nav className="sidebar-nav">
        {bottomItems.map(item => (
          <div
            key={item.id}
            className={`sidebar-nav-item ${currentView === item.id ? 'active' : ''}`}
            onClick={() => handleNav(item.id)}
          >
            {item.icon}
            {item.label}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div
          className="sidebar-nav-item"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          {theme === 'dark' ? <Sun width={18} height={18} /> : <Moon width={18} height={18} />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </div>
      </div>
    </aside>
  );
}

// ============================================
// MOBILE BOTTOM NAV
// ============================================
function MobileNav({ currentView, setCurrentView }: {
  currentView: ViewId;
  setCurrentView: (v: ViewId) => void;
}) {
  const items: { id: ViewId; label: string; icon: React.ReactNode }[] = [
    { id: 'today', label: 'Today', icon: <HomeIcon width={22} height={22} /> },
    { id: 'tasks', label: 'Tasks', icon: <ListTodo width={22} height={22} /> },
    { id: 'courses', label: 'Courses', icon: <BookOpen width={22} height={22} /> },
    { id: 'schedule', label: 'Schedule', icon: <CalendarDays width={22} height={22} /> },
    { id: 'focus-timer', label: 'Timer', icon: <Timer width={22} height={22} /> },
  ];

  return (
    <nav className="mobile-nav">
      {items.map(item => (
        <div
          key={item.id}
          className={`mobile-nav-item ${currentView === item.id ? 'active' : ''}`}
          onClick={() => setCurrentView(item.id)}
        >
          {item.icon}
          {item.label}
        </div>
      ))}
    </nav>
  );
}

// ============================================
// TODAY VIEW
// ============================================
function TodayView({ onNewTask, onFocusTimer }: { onNewTask: () => void; onFocusTimer: () => void }) {
  const [tasks, setTasks] = useState(INITIAL_TASKS);

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const completedCount = tasks.filter(t => t.completed).length;
  const focusScore = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="view active">
      {/* Hero Card */}
      <div className="hero-card">
        <div className="hero-date">{getDateLine()}</div>
        <div className="hero-greeting">{getGreeting()}, Shahab.</div>
        <div className="hero-message">
          Your next move is Lines, Angle of Inclination &amp; Distance Formula in Calculus 1.
        </div>
        <div className="hero-actions">
          <button className="btn btn-accent" onClick={onNewTask}>
            <Star width={15} height={15} /> Start next best task
          </button>
          <button className="btn btn-secondary" onClick={onFocusTimer}>
            <Clock width={15} height={15} /> Focus 25m
          </button>
          <button className="btn btn-ghost" style={{ padding: '9px 12px' }} onClick={onNewTask}>
            <Plus width={15} height={15} />
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-label">Focus Score</div>
          <div className="stat-value">{focusScore}%</div>
          <div className="stat-sub">today&apos;s tasks done</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Study Time</div>
          <div className="stat-value">0h</div>
          <div className="stat-sub">logged today</div>
        </div>
        <div className="stat-card">
          <div className="stat-label"><Flame width={13} height={13} />Streak</div>
          <div className="stat-value">0</div>
          <div className="stat-sub">days in a row</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Program Week</div>
          <div className="stat-value">W20</div>
          <div className="stat-sub">0 weeks left</div>
        </div>
      </div>

      {/* Mission Section */}
      <div className="mission-section">
        <div className="mission-header">
          <div>
            <div className="mission-title">Today&apos;s mission</div>
            <div className="mission-hint">Swipe right to complete · left to postpone</div>
          </div>
        </div>
        <div style={{ marginTop: 14 }}>
          {tasks.map(task => (
            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div
                className={`task-checkbox ${task.completed ? 'checked' : ''}`}
                onClick={() => toggleTask(task.id)}
              >
                {task.completed && <Check width={14} height={14} style={{ color: '#fff' }} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: task.completed ? '#666' : '#fff', textDecoration: task.completed ? 'line-through' : 'none' }}>
                  {task.title}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>{task.courseName} · Lecture {task.lectureNum}</div>
              </div>
              <span className="task-course-badge" style={{ background: `${task.color}22`, color: task.color }}>
                {task.instructor} · L{task.lectureNum}
              </span>
            </div>
          ))}
          <button className="mission-add" style={{ marginTop: 14 }} onClick={onNewTask}>
            <Plus width={14} height={14} /> Add mission
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// TASKS VIEW
// ============================================
function TasksView({ onNewTask }: { onNewTask: () => void }) {
  const [tasks, setTasks] = useState(INITIAL_TASKS);
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'completed'>('today');

  const toggleTask = (id: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const filteredTasks = activeTab === 'today'
    ? tasks
    : activeTab === 'completed'
      ? tasks.filter(t => t.completed)
      : tasks.filter(t => !t.completed);

  return (
    <div className="view active">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
        <div>
          <h2 className="heading" style={{ fontSize: 28, color: '#fff' }}>Tasks</h2>
          <p style={{ fontSize: 14, color: '#888', marginTop: 4 }}>
            {tasks.filter(t => t.completed).length} of {tasks.length} tasks completed
          </p>
        </div>
        <button className="btn btn-accent" onClick={onNewTask}>
          <Plus width={15} height={15} /> New task
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginTop: 20, marginBottom: 20 }}>
        {(['today', 'upcoming', 'completed'] as const).map(tab => (
          <button
            key={tab}
            className={`filter-btn ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Task Cards */}
      {filteredTasks.map(task => (
        <div key={task.id} className="task-card">
          <div
            className={`task-checkbox ${task.completed ? 'checked' : ''}`}
            onClick={() => toggleTask(task.id)}
          >
            {task.completed && <Check width={14} height={14} style={{ color: '#fff' }} />}
          </div>
          <div className="task-priority-dot" style={{ background: PRIORITY_COLORS[task.priority] }} />
          <div className="task-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="task-priority-label" style={{ color: PRIORITY_COLORS[task.priority] }}>
                {PRIORITY_LABELS[task.priority]}
              </span>
              <FileText width={14} height={14} style={{ color: '#666' }} />
            </div>
            <div className="task-title" style={{ textDecoration: task.completed ? 'line-through' : 'none', color: task.completed ? '#666' : '#fff' }}>
              {task.title}
            </div>
            <div className="task-meta">
              <span>{task.courseName} · Lecture {task.lectureNum}</span>
              <span className="task-course-badge" style={{ background: `${task.color}22`, color: task.color }}>
                {task.instructor} · Lecture {task.lectureNum}
              </span>
            </div>
          </div>
          <div className="task-duration">
            <Clock width={14} height={14} />
            {task.duration}m
          </div>
          <div className="task-menu">
            <MoreHorizontal width={18} height={18} />
          </div>
        </div>
      ))}

      {filteredTasks.length === 0 && (
        <div style={{ textAlign: 'center', color: '#666', padding: 40 }}>
          No tasks in this category.
        </div>
      )}
    </div>
  );
}

// ============================================
// COURSES VIEW
// ============================================
function CoursesView({ onCourseClick }: { onCourseClick: (courseId: string) => void }) {
  const totalLectures = COURSES.reduce((sum, c) => sum + c.totalLectures, 0);
  const completedLectures = COURSES.reduce((sum, c) => sum + c.completedLectures, 0);
  const totalPct = totalLectures > 0 ? Math.round((completedLectures / totalLectures) * 100) : 0;

  const sem1 = COURSES.filter(c => c.semester === 1);
  const sem2 = COURSES.filter(c => c.semester === 2);

  const renderCourseCard = (course: Course) => {
    const pct = course.totalLectures > 0 ? Math.round((course.completedLectures / course.totalLectures) * 100) : 0;
    return (
      <div key={course.id} className="course-card" onClick={() => onCourseClick(course.id)}>
        <div className="course-icon" style={{ background: course.color }}>
          {course.icon}
        </div>
        <div className="course-name">{course.name}</div>
        <div className="course-instructor">{course.instructor}</div>
        <div className="course-progress-row">
          <div className="course-progress-pct" style={{ color: course.color }}>{pct}%</div>
          <div className="course-lecture-count">{course.completedLectures}/{course.totalLectures}</div>
        </div>
        <div className="course-progress-bar">
          <div className="course-progress-fill" style={{ width: `${pct}%`, background: course.color }} />
        </div>
      </div>
    );
  };

  return (
    <div className="view active">
      <div className="courses-header">
        <h2 className="heading" style={{ fontSize: 28, color: '#fff' }}>Courses</h2>
      </div>
      <div className="courses-subtitle">
        {completedLectures} of {totalLectures} lectures · {totalPct}% complete
      </div>
      <div className="courses-progress-bar">
        <div className="courses-progress-fill" style={{ width: `${totalPct}%` }} />
      </div>

      <div className="semester-label">Semester 1</div>
      <div className="courses-grid">
        {sem1.map(renderCourseCard)}
      </div>

      <div className="semester-label">Semester 2</div>
      <div className="courses-grid">
        {sem2.map(renderCourseCard)}
      </div>
    </div>
  );
}

// ============================================
// SCHEDULE VIEW
// ============================================
function ScheduleView() {
  const [weeks, setWeeks] = useState(SCHEDULE_WEEKS);

  const toggleWeek = (id: number) => {
    setWeeks(prev => prev.map(w => w.id === id ? { ...w, completed: !w.completed } : w));
  };

  return (
    <div className="view active">
      <h2 className="heading" style={{ fontSize: 28, color: '#fff', marginBottom: 24 }}>Schedule</h2>

      <div className="schedule-grid">
        {weeks.map(week => (
          <div key={week.id} className="schedule-card">
            <div className="schedule-week-title">Week {week.weekNum}</div>
            <div className="schedule-date-range">{week.dateRange}</div>
            {week.courses.map((course, i) => (
              <div key={i} className="schedule-course-item">
                <div className="schedule-course-dot" style={{ background: course.color }} />
                {course.name} <span className="schedule-course-lectures">· {course.lectures}</span>
              </div>
            ))}
            <div className="schedule-mark-complete" onClick={() => toggleWeek(week.id)}>
              <div className={`schedule-checkbox ${week.completed ? 'checked' : ''}`}>
                {week.completed && <Check width={12} height={12} style={{ color: '#fff' }} />}
              </div>
              {week.completed ? 'Completed' : 'Mark complete'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// FOCUS TIMER VIEW
// ============================================
function FocusTimerView() {
  const [mode, setMode] = useState<'focus' | 'short' | 'long'>('focus');
  const [totalSeconds, setTotalSeconds] = useState(25 * 60);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  const modes = { focus: 25 * 60, short: 5 * 60, long: 15 * 60 };
  const modeLabels = { focus: 'Focus 25m', short: 'Short 5m', long: 'Long 15m' };
  const circumference = 2 * Math.PI * 120;
  const progressPct = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;
  const strokeDashoffset = circumference * (1 - progressPct / 100);

  useEffect(() => {
    if (!isRunning) return;
    if (secondsLeft <= 0) {
      setIsRunning(false);
      setSessionsCompleted(prev => prev + 1);
      return;
    }
    const interval = setInterval(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  const switchMode = (m: 'focus' | 'short' | 'long') => {
    setMode(m);
    setTotalSeconds(modes[m]);
    setSecondsLeft(modes[m]);
    setIsRunning(false);
  };

  const handleReset = () => {
    setSecondsLeft(totalSeconds);
    setIsRunning(false);
  };

  return (
    <div className="view active">
      <div className="focus-timer-container">
        <div className="focus-mode-tabs">
          {(Object.keys(modes) as Array<'focus' | 'short' | 'long'>).map(m => (
            <button
              key={m}
              className={`focus-mode-tab ${mode === m ? 'active' : ''}`}
              onClick={() => switchMode(m)}
            >
              {modeLabels[m]}
            </button>
          ))}
        </div>

        <div className="focus-session-label">
          {mode === 'focus' ? 'FOCUS SESSION' : mode === 'short' ? 'SHORT BREAK' : 'LONG BREAK'}
        </div>

        <div className="focus-timer-circle">
          <svg viewBox="0 0 260 260">
            <circle className="track" cx="130" cy="130" r="120" />
            <circle
              className="progress"
              cx="130" cy="130" r="120"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="focus-timer-display">
            <div className="focus-timer-time">{formatTimer(secondsLeft)}</div>
          </div>
        </div>

        <div className="focus-session-dots">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`focus-dot ${i < sessionsCompleted ? 'completed' : ''} ${i === sessionsCompleted ? 'current' : ''}`}
            />
          ))}
        </div>
        <div className="focus-session-count">{sessionsCompleted} total</div>

        <div className="focus-timer-controls">
          <button
            className="btn btn-accent"
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? <X width={15} height={15} /> : <Play width={15} height={15} />}
            {isRunning ? 'Pause' : 'Start'}
          </button>
          <button className="btn btn-ghost" onClick={handleReset}>
            <RotateCcw width={15} height={15} /> Reset
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// EXPORT VIEW
// ============================================
function ExportView() {
  return (
    <div className="view active">
      <h2 className="heading" style={{ fontSize: 28, color: '#fff', marginBottom: 12 }}>Export Notes</h2>
      <p style={{ color: '#888', marginBottom: 24 }}>Export your lecture notes and study progress.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
        <div className="stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-label"><FileText width={13} height={13} />Markdown</div>
          <div className="stat-value" style={{ fontSize: 18 }}>All notes</div>
          <div className="stat-sub">Export as .md file</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-label"><Download width={13} height={13} />PDF</div>
          <div className="stat-value" style={{ fontSize: 18 }}>Progress report</div>
          <div className="stat-sub">Export as .pdf file</div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-label"><BookOpenText width={13} height={13} />CSV</div>
          <div className="stat-value" style={{ fontSize: 18 }}>Lecture data</div>
          <div className="stat-sub">Export as .csv file</div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// COURSE DETAIL VIEW
// ============================================
function CourseDetailView({ courseId, onBack }: { courseId: string; onBack: () => void }) {
  const course = COURSES.find(c => c.id === courseId) || COURSES[0];
  const [lectures, setLectures] = useState<Lecture[]>(
    courseId === 'calc1' ? CALCULUS_LECTURES : CALCULUS_LECTURES.map(l => ({
      ...l,
      id: `${courseId}-${l.number}`,
      title: `Lecture ${l.number}`,
      difficulty: l.number <= 2 ? 'easy' : l.number <= 5 ? 'medium' : 'hard' as const,
    }))
  );
  const [filter, setFilter] = useState<'all' | 'todo' | 'done'>('all');

  // Mini timer state
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    if (!timerRunning || timerSeconds <= 0) return;
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        if (prev <= 1) {
          setTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, timerSeconds]);

  const toggleLecture = (id: string) => {
    setLectures(prev => prev.map(l => l.id === id ? { ...l, completed: !l.completed } : l));
  };

  const updateNotes = (id: string, notes: string) => {
    setLectures(prev => prev.map(l => l.id === id ? { ...l, notes } : l));
  };

  const filteredLectures = filter === 'all'
    ? lectures
    : filter === 'todo'
      ? lectures.filter(l => !l.completed)
      : lectures.filter(l => l.completed);

  const completedCount = lectures.filter(l => l.completed).length;
  const remainingHours = Math.round((lectures.length - completedCount) * 1.1);

  return (
    <div className="view active">
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft width={16} height={16} /> Back to courses
      </button>

      <div className="course-detail-header">
        <div>
          <div className="course-detail-title">{course.name} — {course.instructor}</div>
          <div className="course-detail-subtitle">
            Calculus · ~{remainingHours}h remaining
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="course-detail-timer">
            <span className="timer-display">{formatTimer(timerSeconds)}</span>
            <button
              className="btn btn-accent btn-sm"
              onClick={() => setTimerRunning(!timerRunning)}
            >
              {timerRunning ? <X width={14} height={14} /> : <Play width={14} height={14} />}
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => { setTimerSeconds(25 * 60); setTimerRunning(false); }}
            >
              <RotateCcw width={14} height={14} />
            </button>
          </div>
          <button className="modal-close" onClick={onBack}>
            <X width={18} height={18} />
          </button>
        </div>
      </div>

      <div className="course-detail-filters">
        {(['all', 'todo', 'done'] as const).map(f => (
          <button
            key={f}
            className={`filter-btn ${filter === f ? 'active' : ''}`}
            onClick={() => setFilter(f)}
          >
            {f === 'all' ? 'All' : f === 'todo' ? 'To Do' : 'Done'}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--surface-solid)', borderRadius: 14, border: '1px solid var(--border)', overflow: 'hidden' }}>
        {filteredLectures.map(lecture => (
          <div key={lecture.id} className="lecture-item">
            <div
              className={`lecture-checkbox ${lecture.completed ? 'checked' : ''}`}
              onClick={() => toggleLecture(lecture.id)}
            >
              {lecture.completed && <Check width={14} height={14} style={{ color: '#fff' }} />}
            </div>
            <div className="lecture-info">
              <div className="lecture-name">
                <span style={{ color: '#666', marginRight: 8 }}>{lecture.number}.</span>
                {lecture.title}
              </div>
              <div className="difficulty-tags">
                {lecture.difficulty === 'easy' && (
                  <span className="difficulty-tag difficulty-easy">Easy</span>
                )}
                {lecture.difficulty === 'medium' && (
                  <span className="difficulty-tag difficulty-medium">Medium</span>
                )}
                {lecture.difficulty === 'hard' && (
                  <span className="difficulty-tag difficulty-hard">Hard</span>
                )}
              </div>
              <input
                className="lecture-notes-input"
                placeholder="Key insight or question..."
                value={lecture.notes}
                onChange={e => updateNotes(lecture.id, e.target.value)}
              />
            </div>
            <div className="lecture-actions">
              <button className="watch-btn">
                <Play width={12} height={12} /> Watch
              </button>
            </div>
          </div>
        ))}
        {filteredLectures.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>
            No lectures in this category.
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// QUICK ADD TASK MODAL
// ============================================
function QuickAddModal({ onClose }: { onClose: () => void }) {
  const [taskName, setTaskName] = useState('');
  const [when, setWhen] = useState<'today' | 'tomorrow'>('today');
  const [estimate, setEstimate] = useState(30);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [course, setCourse] = useState('');

  const handleSubmit = () => {
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Quick add task</div>
          <button className="modal-close" onClick={onClose}>
            <X width={18} height={18} />
          </button>
        </div>

        <input
          className="modal-input"
          placeholder="What do you want to do?"
          value={taskName}
          onChange={e => setTaskName(e.target.value)}
          autoFocus
        />

        <div className="modal-section">
          <div className="modal-section-label">When</div>
          <div className="modal-options">
            <button
              className={`modal-option ${when === 'today' ? 'selected' : ''}`}
              onClick={() => setWhen('today')}
            >
              Today
            </button>
            <button
              className={`modal-option ${when === 'tomorrow' ? 'selected' : ''}`}
              onClick={() => setWhen('tomorrow')}
            >
              Tomorrow
            </button>
          </div>
        </div>

        <div className="modal-section">
          <div className="modal-section-label">Estimate</div>
          <div className="modal-estimate">
            <input
              type="range"
              className="modal-estimate-slider"
              min={15}
              max={120}
              step={15}
              value={estimate}
              onChange={e => setEstimate(Number(e.target.value))}
            />
            <div className="modal-estimate-value">{estimate}M</div>
          </div>
        </div>

        <div className="modal-section">
          <div className="modal-section-label">Priority</div>
          <div className="modal-options">
            {(['low', 'medium', 'high', 'urgent'] as const).map(p => (
              <button
                key={p}
                className={`modal-option ${priority === p ? 'selected' : ''}`}
                onClick={() => setPriority(p)}
                style={priority === p ? { borderColor: PRIORITY_COLORS[p === 'urgent' ? 'high' : p], color: PRIORITY_COLORS[p === 'urgent' ? 'high' : p] } : {}}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-section">
          <div className="modal-section-label">Course (Optional)</div>
          <select
            className="modal-select"
            value={course}
            onChange={e => setCourse(e.target.value)}
          >
            <option value="">— None —</option>
            {COURSES.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <button className="modal-submit" onClick={handleSubmit}>
          Add task
        </button>
      </div>
    </div>
  );
}

// ============================================
// TOPBAR COMPONENT
// ============================================
function Topbar({ onNewTask, onHamburger }: { onNewTask: () => void; onHamburger: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="topbar">
      <button className="hamburger-btn" onClick={onHamburger}>
        <Menu width={20} height={20} />
      </button>
      <div className="search-box">
        <Search width={16} height={16} style={{ color: '#666' }} />
        <input
          placeholder="Search lectures... (⌘K)"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <span className="kbd">⌘K</span>
      </div>
      <button className="btn btn-accent" onClick={onNewTask}>
        <Plus width={15} height={15} /> <span className="desktop-only">New task</span>
      </button>
    </div>
  );
}

// ============================================
// MAIN HOME COMPONENT
// ============================================
export default function Home() {
  const [currentView, setCurrentView] = useState<ViewId>('today');
  const [showModal, setShowModal] = useState(false);
  const [courseDetailId, setCourseDetailId] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const handleNewTask = useCallback(() => setShowModal(true), []);
  const handleFocusTimer = useCallback(() => setCurrentView('focus-timer'), []);

  const handleCourseClick = useCallback((courseId: string) => {
    setCourseDetailId(courseId);
  }, []);

  const handleBackFromCourse = useCallback(() => {
    setCourseDetailId(null);
  }, []);

  const renderContent = () => {
    // If a course detail is open, show it
    if (courseDetailId) {
      return <CourseDetailView courseId={courseDetailId} onBack={handleBackFromCourse} />;
    }

    switch (currentView) {
      case 'today':
        return <TodayView onNewTask={handleNewTask} onFocusTimer={handleFocusTimer} />;
      case 'tasks':
        return <TasksView onNewTask={handleNewTask} />;
      case 'courses':
        return <CoursesView onCourseClick={handleCourseClick} />;
      case 'schedule':
        return <ScheduleView />;
      case 'focus-timer':
        return <FocusTimerView />;
      case 'export':
        return <ExportView />;
      default:
        return <TodayView onNewTask={handleNewTask} onFocusTimer={handleFocusTimer} />;
    }
  };

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} />

      {/* Mobile Sidebar Overlay */}
      <div
        className={`mobile-sidebar-overlay ${mobileDrawerOpen ? 'open' : ''}`}
        onClick={() => setMobileDrawerOpen(false)}
      />
      <div className={`mobile-sidebar-drawer ${mobileDrawerOpen ? 'open' : ''}`}>
        <Sidebar
          currentView={currentView}
          setCurrentView={(v) => { setCurrentView(v); setMobileDrawerOpen(false); setCourseDetailId(null); }}
          onClose={() => setMobileDrawerOpen(false)}
        />
      </div>

      {/* Main Content */}
      <div className="main-content">
        <Topbar
          onNewTask={handleNewTask}
          onHamburger={() => setMobileDrawerOpen(true)}
        />
        <div className="content-area">
          {renderContent()}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav
        currentView={currentView}
        setCurrentView={(v) => { setCurrentView(v); setCourseDetailId(null); }}
      />

      {/* Quick Add Modal */}
      {showModal && <QuickAddModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
