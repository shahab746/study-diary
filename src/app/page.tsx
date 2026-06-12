'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { useStudyOS, type SubjectProgress, type TodayTask, type SubjectDetail, type SubjectDetailChapter } from '@/lib/store';
import { LoginPage } from '@/components/auth/LoginPage';
import LandingPage from '@/components/landing/LandingPage';
import {
  Home as HomeIcon, ListTodo, BookOpen, Timer, Moon, Sun,
  Search, Plus, Star, Clock, Play, X, ChevronLeft,
  Check, Flame, RotateCcw, BookOpenText, ArrowLeft,
  FileText, Menu, LogOut, Sigma, Cpu, Zap, Beaker, Atom, Pi, Landmark,
  FileText as PdfIcon, Lock, Wifi, WifiOff, RefreshCw, CloudOff
} from 'lucide-react';

// ============================================
// ICON MAP
// ============================================
const ICON_MAP: Record<string, React.ReactNode> = {
  sigma: <Sigma width={20} height={20} />,
  cpu: <Cpu width={20} height={20} />,
  zap: <Zap width={20} height={20} />,
  book: <BookOpen width={20} height={20} />,
  beaker: <Beaker width={20} height={20} />,
  atom: <Atom width={20} height={20} />,
  pi: <Pi width={20} height={20} />,
  landmark: <Landmark width={20} height={20} />,
};
function getIcon(iconName: string): React.ReactNode {
  return ICON_MAP[iconName?.toLowerCase()] || <BookOpen width={20} height={20} />;
}

// ============================================
// TYPES
// ============================================
type ViewId = 'today' | 'tasks' | 'courses' | 'focus-timer';

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
function Sidebar({ currentView, setCurrentView, onClose, studentName, totalLecs }: {
  currentView: ViewId;
  setCurrentView: (v: ViewId) => void;
  onClose?: () => void;
  studentName: string;
  totalLecs: number;
}) {
  const { theme, setTheme } = useTheme();

  const navItems: { id: ViewId; label: string; icon: React.ReactNode }[] = [
    { id: 'today', label: 'Today', icon: <HomeIcon width={18} height={18} /> },
    { id: 'tasks', label: 'Tasks', icon: <ListTodo width={18} height={18} /> },
    { id: 'courses', label: 'Courses', icon: <BookOpen width={18} height={18} /> },
  ];

  const bottomItems: { id: ViewId; label: string; icon: React.ReactNode }[] = [
    { id: 'focus-timer', label: 'Focus timer', icon: <Timer width={18} height={18} /> },
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
          <h1 className="heading">Study Diary</h1>
          <span>{studentName || 'Student'} · {totalLecs} Topics</span>
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
        <div
          className="sidebar-nav-item"
          onClick={() => signOut({ callbackUrl: '/' })}
          style={{ color: '#FF6B60' }}
        >
          <LogOut width={18} height={18} />
          Sign out
        </div>
      </div>
    </aside>
  );
}

// ============================================
// MOBILE SWIPEABLE NAV
// ============================================
function MobileNav({ currentView, setCurrentView }: {
  currentView: ViewId;
  setCurrentView: (v: ViewId) => void;
}) {
  const items: { id: ViewId | 'sign-out'; label: string; icon: React.ReactNode }[] = [
    { id: 'today', label: 'Today', icon: <HomeIcon width={18} height={18} /> },
    { id: 'tasks', label: 'Tasks', icon: <ListTodo width={18} height={18} /> },
    { id: 'courses', label: 'Courses', icon: <BookOpen width={18} height={18} /> },
    { id: 'focus-timer', label: 'Focus Timer', icon: <Timer width={18} height={18} /> },
    { id: 'sign-out', label: 'Sign Out', icon: <LogOut width={18} height={18} /> },
  ];

  const handleTap = (id: ViewId | 'sign-out') => {
    if (id === 'sign-out') {
      signOut({ callbackUrl: '/' });
      return;
    }
    setCurrentView(id);
  };

  return (
    <nav className="mobile-swipe-nav">
      <div className="mobile-swipe-track">
        {items.map(item => {
          const isSignOut = item.id === 'sign-out';
          const isActive = !isSignOut && currentView === item.id;
          return (
            <button
              key={item.id}
              className={`mobile-swipe-item ${isActive ? 'active' : ''} ${isSignOut ? 'sign-out-btn' : ''}`}
              onClick={() => handleTap(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

// ============================================
// LOADING SKELETON
// ============================================
function LoadingSkeleton() {
  return (
    <div className="view active">
      <div className="hero-card" style={{ opacity: 0.5 }}>
        <div style={{ height: 14, width: 120, background: '#2a2a2a', borderRadius: 6, marginBottom: 12 }} />
        <div style={{ height: 28, width: 260, background: '#2a2a2a', borderRadius: 6, marginBottom: 12 }} />
        <div style={{ height: 16, width: 400, background: '#2a2a2a', borderRadius: 6 }} />
      </div>
      <div className="stats-grid">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="stat-card" style={{ opacity: 0.5 }}>
            <div style={{ height: 32, width: 60, background: '#2a2a2a', borderRadius: 6, margin: '0 auto' }} />
          </div>
        ))}
      </div>
      <div className="mission-section" style={{ opacity: 0.5 }}>
        <div style={{ height: 16, width: 160, background: '#2a2a2a', borderRadius: 6, marginBottom: 20 }} />
        {[1, 2, 3].map(i => (
          <div key={i} style={{ height: 40, background: '#2a2a2a', borderRadius: 6, marginBottom: 8 }} />
        ))}
      </div>
    </div>
  );
}

// ============================================
// TODAY VIEW
// ============================================
function TodayView({ onNewTask, onFocusTimer, onCourseClick }: { onNewTask: () => void; onFocusTimer: () => void; onCourseClick: (subjectId: string) => void }) {
  const store = useStudyOS();
  const tasks = store.todayTasks;
  const student = store.student;
  const toggleTask = store.toggleTaskComplete;
  const subjects = store.subjects;

  const completedCount = tasks.filter(t => t.completed).length;
  const focusScore = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : store.focusScore;

  // Circular progress ring calculations
  const ringRadius = 54;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringStrokeOffset = ringCircumference * (1 - focusScore / 100);

  // Sync status
  const lastSynced = store.lastSynced;
  const isOnline = store.isOnline;
  const pendingSyncCount = store.pendingSyncCount;

  const handleManualSync = () => {
    if (isOnline) store.syncNow();
  };

  return (
    <div className="view active">
      {/* Top Section: Greeting + Day + Sync */}
      <div className="dashboard-header">
        <div className="dashboard-greeting-row">
          <div>
            <div className="dashboard-greeting-text">{getGreeting()}</div>
            <div className="dashboard-name-row">
              <span className="dashboard-name">{student?.name || 'Student'}</span>
              <span className="dashboard-day-badge">Day {student?.currentDay || 1}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Streak badge */}
            <div className="dashboard-streak">
              <Flame width={18} height={18} style={{ color: '#FF9500' }} />
              <span className="dashboard-streak-count">{store.streak}</span>
            </div>
            {/* Sync indicator */}
            <span
              className="dashboard-sync"
              onClick={handleManualSync}
              title={isOnline ? (pendingSyncCount > 0 ? `${pendingSyncCount} pending syncs — tap to sync` : 'Tap to sync') : 'Offline — changes saved locally'}
            >
              {isOnline ? (
                pendingSyncCount > 0 ? (
                  <RefreshCw width={12} height={12} style={{ color: '#FF9500' }} />
                ) : (
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22C55E', display: 'inline-block' }} />
                )
              ) : (
                <WifiOff width={12} height={12} style={{ color: '#FF9500' }} />
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Focus Score Ring Section */}
      <div className="dashboard-focus-section">
        <div className="dashboard-focus-ring-wrapper">
          <svg className="dashboard-focus-ring" viewBox="0 0 120 120">
            <circle className="focus-ring-track" cx="60" cy="60" r={ringRadius} />
            <circle
              className="focus-ring-progress"
              cx="60" cy="60" r={ringRadius}
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringStrokeOffset}
            />
          </svg>
          <div className="dashboard-focus-center">
            <div className="dashboard-focus-pct">{focusScore}%</div>
            <div className="dashboard-focus-label">Focus Score</div>
          </div>
        </div>
        <div className="dashboard-focus-info">
          {completedCount} of {tasks.length} tasks done
        </div>
      </div>

      {/* Subject Progress Grid */}
      <div className="dashboard-section-header">
        <span>Subjects</span>
        <span className="dashboard-section-sub">{store.totalCompleted}/{store.totalTopics} done</span>
      </div>
      <div className="dashboard-subjects-grid">
        {subjects.map(subject => (
          <div key={subject.subjectId} className="dashboard-subject-card" onClick={() => onCourseClick(subject.subjectId)}>
            <div className="dashboard-subject-icon" style={{ background: subject.color }}>
              {getIcon(subject.icon)}
            </div>
            <div className="dashboard-subject-info">
              <div className="dashboard-subject-name">{subject.subjectName}</div>
              <div className="dashboard-subject-pct" style={{ color: subject.color }}>{subject.progressPct}%</div>
            </div>
            <div className="dashboard-subject-bar">
              <div className="dashboard-subject-bar-fill" style={{ width: `${subject.progressPct}%`, background: subject.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* Today's Tasks */}
      <div className="dashboard-section-header" style={{ marginTop: 24 }}>
        <span>Today&apos;s Tasks</span>
        <span className="dashboard-section-sub">{completedCount} of {tasks.length}</span>
      </div>
      <div className="dashboard-tasks-list">
        {tasks.map(task => (
          <div key={task.topicId} className="dashboard-task-item">
            <div
              className={`dashboard-task-check ${task.completed ? 'checked' : ''}`}
              onClick={() => toggleTask(task.topicId)}
            >
              {task.completed && <Check width={14} height={14} style={{ color: '#fff' }} />}
            </div>
            <div className="dashboard-task-info">
              <div className="dashboard-task-name" style={{ color: task.completed ? '#666' : '#fff', textDecoration: task.completed ? 'line-through' : 'none' }}>
                {task.topicName}
              </div>
              <div className="dashboard-task-subject">{task.subjectName}</div>
            </div>
          </div>
        ))}
        {tasks.length === 0 && (
          <div className="dashboard-tasks-empty">
            No tasks for today. Enjoy your break!
          </div>
        )}
      </div>
      <button className="dashboard-add-task" onClick={onNewTask}>
        <Plus width={14} height={14} /> Add task
      </button>
    </div>
  );
}

// ============================================
// TASKS VIEW
// ============================================
function TasksView({ onNewTask }: { onNewTask: () => void }) {
  const store = useStudyOS();
  const tasks = store.todayTasks;
  const toggleTask = store.toggleTaskComplete;
  const [activeTab, setActiveTab] = useState<'today' | 'upcoming' | 'completed'>('today');

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
          <p style={{ fontSize: 14, color: '#8E8E93', marginTop: 4 }}>
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
        <div key={task.topicId} className="task-card">
          <div className="task-card-top">
            <div
              className={`task-checkbox ${task.completed ? 'checked' : ''}`}
              onClick={() => toggleTask(task.topicId)}
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
                {task.topicName}
              </div>
              <div className="task-meta">
                <span>{task.subjectName} · {task.chapterName}</span>
                <span className="task-course-badge" style={{ background: `${task.subjectColor}22`, color: task.subjectColor }}>
                  D{task.dayNumber}
                </span>
              </div>
            </div>
          </div>
          <div className="task-card-bottom">
            <div className="task-duration">
              <Clock width={14} height={14} />
              {task.duration}m
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {task.videoLink && (
                <a href={task.videoLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                  <button className="watch-btn">
                    <Play width={13} height={13} /> Watch
                  </button>
                </a>
              )}
              {task.pdfLink && (
                <a href={task.pdfLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                  <button className="watch-btn" style={{ background: '#FF3B30' }}>
                    <FileText width={13} height={13} /> Notes
                  </button>
                </a>
              )}
            </div>
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
function CoursesView({ onCourseClick }: { onCourseClick: (subjectId: string) => void }) {
  const store = useStudyOS();
  const subjects = store.subjects;
  const isFreeUser = store.isFreeUser;

  const totalTopics = subjects.reduce((sum, s) => sum + s.totalTopics, 0);
  const completedTopics = subjects.reduce((sum, s) => sum + s.completedTopics, 0);
  const totalPremium = subjects.reduce((sum, s) => sum + (s.premiumTopicCount || 0), 0);
  const totalPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="view active">
      <div className="courses-header">
        <h2 className="heading" style={{ fontSize: 28, color: '#fff' }}>Subjects</h2>
      </div>
      <div className="courses-subtitle">
        {completedTopics} of {totalTopics} topics · {totalPct}% complete
        {isFreeUser && totalPremium > 0 && (
          <span style={{ color: '#F59E0B', marginLeft: 8 }}>
            · {totalPremium} premium
          </span>
        )}
      </div>
      <div className="courses-progress-bar">
        <div className="courses-progress-fill" style={{ width: `${totalPct}%` }} />
      </div>

      {/* Free user upgrade banner */}
      {isFreeUser && totalPremium > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 12,
          padding: '14px 18px',
          marginTop: 14,
          marginBottom: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <Lock width={20} height={20} style={{ color: '#F59E0B', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#F59E0B' }}>
              Unlock Premium Content
            </div>
            <div style={{ fontSize: 12, color: '#8E8E93', marginTop: 2 }}>
              {totalPremium} topics are available with a premium subscription
            </div>
          </div>
        </div>
      )}

      <div className="courses-grid">
        {subjects.map(subject => {
          const pct = subject.progressPct;
          const hasPremium = (subject.premiumTopicCount || 0) > 0;
          return (
            <div key={subject.subjectId} className="course-card" onClick={() => onCourseClick(subject.subjectId)}>
              <div className="course-icon" style={{ background: subject.color }}>
                {getIcon(subject.icon)}
              </div>
              <div className="course-name">
                {subject.subjectName}
                {isFreeUser && hasPremium && (
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    background: 'rgba(245,158,11,0.2)',
                    color: '#F59E0B',
                    padding: '2px 6px',
                    borderRadius: 4,
                    marginLeft: 6,
                    verticalAlign: 'middle',
                    letterSpacing: '0.5px',
                  }}>
                    PREMIUM
                  </span>
                )}
              </div>
              <div className="course-instructor">
                {subject.chapterCount} chapters · {subject.freeTopicCount || 0} free{isFreeUser && hasPremium ? ` of ${subject.totalTopics}` : ''}
              </div>
              <div className="course-progress-row">
                <div className="course-progress-pct" style={{ color: subject.color }}>{pct}%</div>
                <div className="course-lecture-count">{subject.completedTopics}/{isFreeUser && hasPremium ? subject.freeTopicCount : subject.totalTopics}</div>
              </div>
              <div className="course-progress-bar">
                <div className="course-progress-fill" style={{ width: `${pct}%`, background: subject.color }} />
              </div>
            </div>
          );
        })}
      </div>

      {subjects.length === 0 && (
        <div style={{ textAlign: 'center', color: '#666', padding: 40 }}>
          No subjects available for your grade and field.
        </div>
      )}
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
    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          setSessionsCompleted(p => p + 1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

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
// SUBJECT DETAIL VIEW
// ============================================
function SubjectDetailView({ subjectId, onBack }: { subjectId: string; onBack: () => void }) {
  const store = useStudyOS();
  const subject = store.subjects.find(s => s.subjectId === subjectId);
  const detail = store.subjectDetail;
  const loading = store.subjectDetailLoading;
  const isFreeUser = store.isFreeUser;

  // Fetch detail on mount
  const openSubjectDetail = store.openSubjectDetail;
  useEffect(() => {
    if (subjectId) {
      openSubjectDetail(subjectId);
    }
  }, [subjectId, openSubjectDetail]);

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

  if (loading || !detail) {
    return (
      <div className="view active">
        <button className="back-btn" onClick={onBack}>
          <ArrowLeft width={16} height={16} /> Back to subjects
        </button>
        <div style={{ textAlign: 'center', padding: 60, color: '#8E8E93' }}>
          Loading subject details...
        </div>
      </div>
    );
  }

  const allTopics = detail.chapters.flatMap(ch => ch.topics);
  const completedCount = allTopics.filter(t => t.completed).length;
  const remainingHours = Math.round((allTopics.length - completedCount) * 1.1);
  const premiumCount = allTopics.filter(t => t.isFree === false).length;
  const freeCount = allTopics.filter(t => t.isFree !== false).length;

  const filteredChapters = detail.chapters.map(ch => ({
    ...ch,
    topics: filter === 'all' ? ch.topics
      : filter === 'todo' ? ch.topics.filter(t => !t.completed)
        : ch.topics.filter(t => t.completed),
  })).filter(ch => ch.topics.length > 0);

  const pct = detail.totalTopics > 0 ? Math.round((detail.completedTopics / detail.totalTopics) * 100) : 0;

  return (
    <div className="view active">
      <button className="back-btn" onClick={onBack}>
        <ArrowLeft width={16} height={16} /> Back to subjects
      </button>

      <div className="course-detail-header">
        <div>
          <div className="course-detail-title">{detail.name}</div>
          <div className="course-detail-subtitle">
            {pct}% complete · {detail.completedTopics}/{detail.totalTopics} topics · ~{remainingHours}h remaining
            {isFreeUser && premiumCount > 0 && (
              <span style={{ color: '#F59E0B', marginLeft: 6 }}>
                · {premiumCount} premium
              </span>
            )}
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

      {/* Free user upgrade banner in subject detail */}
      {isFreeUser && premiumCount > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(245,158,11,0.15) 0%, rgba(245,158,11,0.05) 100%)',
          border: '1px solid rgba(245,158,11,0.3)',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <Lock width={18} height={18} style={{ color: '#F59E0B', flexShrink: 0 }} />
          <div>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#F59E0B' }}>
              {freeCount} free topics · {premiumCount} premium
            </span>
            <span style={{ fontSize: 12, color: '#8E8E93', marginLeft: 8 }}>
              Upgrade to unlock all content
            </span>
          </div>
        </div>
      )}

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
        {filteredChapters.map(chapter => (
          <div key={chapter.id}>
            <div style={{ padding: '12px 16px', background: '#1A1A1A', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#ccc' }}>
                Ch {chapter.number}: {chapter.name}
              </span>
              <span style={{ fontSize: 11, color: '#8E8E93' }}>
                {chapter.completedTopics}/{chapter.totalTopics}
              </span>
            </div>
            {chapter.topics.map(topic => {
              const isPremium = topic.isFree === false;
              const isLockedForUser = isFreeUser && isPremium;
              return (
                <div key={topic.id} className={`lecture-item ${isLockedForUser ? 'premium-locked' : ''}`}>
                  <div
                    className={`lecture-checkbox ${topic.completed ? 'checked' : ''} ${isLockedForUser ? 'disabled' : ''}`}
                    onClick={() => !isLockedForUser && store.toggleSubjectDetailTopic(topic.id)}
                    style={isLockedForUser ? { opacity: 0.3, cursor: 'not-allowed' } : {}}
                  >
                    {topic.completed && !isLockedForUser && <Check width={14} height={14} style={{ color: '#fff' }} />}
                    {isLockedForUser && <Lock width={12} height={12} style={{ color: '#8E8E93' }} />}
                  </div>
                  <div className="lecture-info" style={isLockedForUser ? { opacity: 0.5 } : {}}>
                    <div className="lecture-name">
                      <span style={{ color: '#666', marginRight: 8 }}>{topic.number}.</span>
                      {topic.name}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                      {topic.dayNumber > 0 && (
                        <span className="difficulty-tag" style={{ background: 'rgba(59,130,246,0.15)', color: '#3B82F6' }}>
                          Day {topic.dayNumber}
                        </span>
                      )}
                      {isPremium && (
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          background: isLockedForUser ? 'rgba(245,158,11,0.2)' : 'rgba(245,158,11,0.1)',
                          color: '#F59E0B',
                          padding: '2px 8px',
                          borderRadius: 4,
                          letterSpacing: '0.5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}>
                          <Lock width={10} height={10} /> PREMIUM
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="lecture-actions" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {topic.hasVideo && (
                      <a href={topic.videoLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                        <button className="watch-btn" style={{ padding: '7px 14px' }}>
                          <Play width={13} height={13} /> Watch
                        </button>
                      </a>
                    )}
                    {topic.hasPdf && (
                      <a href={topic.pdfLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}>
                        <button className="watch-btn" style={{ padding: '7px 14px', background: '#FF3B30' }}>
                          <FileText width={13} height={13} /> Notes
                        </button>
                      </a>
                    )}
                    {isLockedForUser && !topic.hasVideo && !topic.hasPdf && (
                      <span style={{ fontSize: 11, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                        <Lock width={12} height={12} /> Locked
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {filteredChapters.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: '#666' }}>
            No topics in this category.
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
  const store = useStudyOS();
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
          <div className="modal-section-label">Subject (Optional)</div>
          <select
            className="modal-select"
            value={course}
            onChange={e => setCourse(e.target.value)}
          >
            <option value="">— None —</option>
            {store.subjects.map(s => (
              <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>
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
          placeholder="Search lectures..."
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
  const sessionResult = useSession();
  const status = sessionResult?.status ?? 'loading';
  const session = sessionResult?.data ?? null;
  const store = useStudyOS();
  const [currentView, setCurrentView] = useState<ViewId>('today');
  const [showModal, setShowModal] = useState(false);
  const [subjectDetailId, setSubjectDetailId] = useState<string | null>(null);
  const [initialFetchDone, setInitialFetchDone] = useState(false);

  // All hooks must be called before any conditional returns
  const handleNewTask = useCallback(() => setShowModal(true), []);

  // Combined view change handler — always clears subject detail so tabs work
  const handleViewChange = useCallback((v: ViewId) => {
    setCurrentView(v);
    setSubjectDetailId(null);
  }, []);

  const handleFocusTimer = useCallback(() => handleViewChange('focus-timer'), [handleViewChange]);

  const handleCourseClick = useCallback((subjectId: string) => {
    setSubjectDetailId(subjectId);
  }, []);

  const closeSubjectDetail = store.closeSubjectDetail;
  const handleBackFromCourse = useCallback(() => {
    closeSubjectDetail();
    setSubjectDetailId(null);
  }, [closeSubjectDetail]);

  // Fetch data when session is available
  const fetchData = store.fetchData;
  const initNetwork = store._initNetworkListeners;
  useEffect(() => {
    if (status === 'authenticated' && session?.user && !initialFetchDone) {
      const phone = (session.user as Record<string, unknown>).phone as string;
      if (phone) {
        fetchData(phone).then(() => setInitialFetchDone(true));
      }
    }
  }, [status, session, initialFetchDone, fetchData]);

  // Initialize network listeners for offline/online detection
  useEffect(() => {
    const cleanup = initNetwork();
    return () => { cleanup?.(); };
  }, [initNetwork]);

  // Show landing page if not authenticated
  if (status === 'unauthenticated') {
    return <LandingPage />;
  }

  // Loading while checking auth
  if (status === 'loading') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#121212' }}>
        <div style={{ textAlign: 'center', color: '#8E8E93' }}>
          <BookOpenText width={32} height={32} style={{ color: '#FF3B30', margin: '0 auto 12px' }} />
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const studentName = store.student?.name || (session?.user?.name as string) || 'Student';
  const totalLecs = store.totalTopics;

  const renderContent = () => {
    if (store.isLoading) {
      return <LoadingSkeleton />;
    }

    // If a subject detail is open, show it
    if (subjectDetailId) {
      return <SubjectDetailView subjectId={subjectDetailId} onBack={handleBackFromCourse} />;
    }

    switch (currentView) {
      case 'today':
        return <TodayView onNewTask={handleNewTask} onFocusTimer={handleFocusTimer} onCourseClick={handleCourseClick} />;
      case 'tasks':
        return <TasksView onNewTask={handleNewTask} />;
      case 'courses':
        return <CoursesView onCourseClick={handleCourseClick} />;
      case 'focus-timer':
        return <FocusTimerView />;
      default:
        return <TodayView onNewTask={handleNewTask} onFocusTimer={handleFocusTimer} onCourseClick={handleCourseClick} />;
    }
  };

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={handleViewChange}
        studentName={studentName}
        totalLecs={totalLecs}
      />

      {/* Main Content */}
      <div className="main-content">
        <Topbar
          onNewTask={handleNewTask}
          onHamburger={() => {}}
        />
        <div className="content-area">
          {renderContent()}
        </div>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav
        currentView={currentView}
        setCurrentView={handleViewChange}
      />

      {/* Quick Add Modal */}
      {showModal && <QuickAddModal onClose={() => setShowModal(false)} />}


    </div>
  );
}
