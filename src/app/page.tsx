'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import { useStudyOS, type SubjectProgress, type TodayTask } from '@/lib/store';
import { useTheme } from 'next-themes';
import { signOut } from 'next-auth/react';
import { LoginPage } from '@/components/auth/LoginPage';
import {
  LayoutDashboard, Mic, CalendarDays, Library, Sparkles, Search, Settings,
  LifeBuoy, Moon, Sun, Plus, Bell, Play, Clock, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, BookMarked, Brain, ChevronRight as ChevronRightIcon,
  X, Download, Copy, SlidersHorizontal, MoreHorizontal, BookOpenText, Cpu,
  Sigma, Leaf, Atom, FlaskConical, Zap, Loader2, LogOut, CheckCircle2, ExternalLink,
  Home as HomeIcon, ListTodo, BookOpen, Timer, FileText
} from 'lucide-react';
import { useSyncExternalStore } from 'react';

type ViewId = 'dashboard' | 'lectures' | 'calendar' | 'subjects' | 'insights' | 'search' | 'settings';

// ============================================
// DYNAMIC EMPTY-STATE COPY CONFIGURATION
// ============================================

interface MetricCopyConfig {
  trendIcon: 'up' | 'down';
  trendText: string;
}

/**
 * Returns contextual copy for dashboard metrics based on user activity state.
 * Condition A (New User / Zero Data): Welcoming, high-encouragement copy
 * Condition B (Active User falling behind): Constructive feedback loop
 */
function getFocusCopy(focusScore: number, totalCompleted: number): MetricCopyConfig {
  // Condition A: New user — no data yet
  if (totalCompleted === 0) {
    return {
      trendIcon: 'up',
      trendText: 'Your journey starts here!',
    };
  }
  // High performers
  if (focusScore >= 70) {
    return {
      trendIcon: 'up',
      trendText: 'Great focus!',
    };
  }
  // Condition B: Active user falling behind
  if (focusScore >= 40) {
    return {
      trendIcon: 'down',
      trendText: 'Room to improve',
    };
  }
  return {
    trendIcon: 'down',
    trendText: "Let's pick up the pace",
  };
}

function getLecturesCopy(totalCompleted: number): string {
  if (totalCompleted === 0) return 'Ready to start your first session!';
  if (totalCompleted <= 5) return `+${Math.min(totalCompleted, 12)}% this month — great start!`;
  return `+${Math.min(totalCompleted, 12)}% this month`;
}

function getHoursCopy(studyMinutes: number, totalCompleted: number): string {
  if (totalCompleted === 0) return 'Your study hours await!';
  if (studyMinutes > 0) return `+${(studyMinutes / 60).toFixed(1)}h today`;
  return '0h today';
}

function getTopicsCopy(totalCompleted: number, totalTopics: number): string {
  if (totalCompleted === 0) return '0% — let\'s change that!';
  return `${totalCompleted}/${totalTopics} total`;
}

function getStreakCopy(streak: number, totalCompleted: number): string {
  if (totalCompleted === 0) return "Let's kick off your streak! 🔥";
  if (streak > 0) return '🔥 Keep it going!';
  return 'Start your streak today!';
}

function getInsightFocusCopy(focusScore: number, totalCompleted: number): string {
  if (totalCompleted === 0) return 'Ready to start your first session!';
  if (focusScore >= 70) return 'Great focus this week';
  if (focusScore >= 40) return 'Room to improve';
  return "Let's pick up the pace";
}

function getAIReflectionCopy(focusScore: number, totalCompleted: number): string {
  if (totalCompleted === 0) {
    return '"Welcome aboard! 🚀 Your study journey is about to begin. Start with your first lecture today — every great achievement starts with a single step. You\'ve got this!"';
  }
  if (focusScore >= 70) {
    return `"You're making excellent progress! Your focus score is strong at ${focusScore}%. Keep maintaining this momentum and consider increasing your daily target."`;
  }
  if (focusScore >= 40) {
    return `"Your focus score is at ${focusScore}%. Try breaking study sessions into shorter, focused blocks. Even 25 minutes of deep focus beats an hour of distracted reading."`;
  }
  return `"Your focus score is at ${focusScore}%. Don't worry — every expert was once a beginner. Try tackling just one topic today to build momentum. Small wins compound fast!"`;
}

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}

// Subject color mapping — updated for premium dark design
function getSubjectTagClass(subjectName: string): string {
  const lower = subjectName.toLowerCase();
  if (lower.includes('computer') || lower.includes('cs')) return 'tag-cs';
  if (lower.includes('math')) return 'tag-math';
  if (lower.includes('bio')) return 'tag-bio';
  if (lower.includes('phys')) return 'tag-phys';
  if (lower.includes('chem')) return 'tag-chem';
  return 'tag-cs';
}

function getSubjectColor(subjectName: string): string {
  const lower = subjectName.toLowerCase();
  if (lower.includes('computer') || lower.includes('cs')) return '#8B5CF6';    // violet
  if (lower.includes('math')) return '#F59E0B';                                  // amber
  if (lower.includes('bio')) return '#10B981';                                    // green/emerald
  if (lower.includes('phys')) return '#7C3AED';                                   // accent/purple
  if (lower.includes('chem')) return '#10B981';                                    // green/emerald
  return '#8B5CF6';                                                               // violet default
}

function getSubjectIcon(subjectName: string) {
  const lower = subjectName.toLowerCase();
  if (lower.includes('computer') || lower.includes('cs')) return <Cpu width={18} height={18} />;
  if (lower.includes('math')) return <Sigma width={18} height={18} />;
  if (lower.includes('bio')) return <Leaf width={18} height={18} />;
  if (lower.includes('phys')) return <Atom width={18} height={18} />;
  if (lower.includes('chem')) return <FlaskConical width={18} height={18} />;
  return <BookOpenText width={18} height={18} />;
}

// ============================================
// SIDEBAR
// ============================================
function Sidebar() {
  const { student, totalCompleted, subjects, sidebarView, setSidebarView } = useStudyOS();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const initials = student?.name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'S';

  const navItems: { id: ViewId; label: string; icon: React.ReactNode; count?: number; badge?: string }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard width={18} height={18} /> },
    { id: 'lectures', label: 'Lectures', icon: <Mic width={18} height={18} />, count: totalCompleted },
    { id: 'calendar', label: 'Calendar', icon: <CalendarDays width={18} height={18} /> },
    { id: 'subjects', label: 'Subjects', icon: <Library width={18} height={18} />, count: subjects.length },
  ];

  const intelItems: { id: ViewId; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'insights', label: 'AI Insights', icon: <Sparkles width={18} height={18} />, badge: 'NEW' },
    { id: 'search', label: 'Search', icon: <Search width={18} height={18} /> },
  ];

  const accountItems: { id: ViewId; label: string; icon: React.ReactNode }[] = [
    { id: 'settings', label: 'Settings', icon: <Settings width={18} height={18} /> },
  ];

  return (
    <aside className="sidebar-premium">
      <div className="brand">
        <div className="brand-mark"><BookOpenText width={18} height={18} /></div>
        <div className="brand-text">
          <h1 className="heading">Lecture Diary</h1>
          <span>Study Companion</span>
        </div>
      </div>

      <div className="nav-section">
        <div className="nav-label">Workspace</div>
        {navItems.map(item => (
          <div
            key={item.id}
            className={`nav-item ${sidebarView === item.id ? 'active' : ''}`}
            onClick={() => setSidebarView(item.id)}
          >
            {item.icon}
            {item.label}
            {item.count !== undefined && <span className="count">{item.count}</span>}
          </div>
        ))}
      </div>

      <div className="nav-section">
        <div className="nav-label">Intelligence</div>
        {intelItems.map(item => (
          <div
            key={item.id}
            className={`nav-item ${sidebarView === item.id ? 'active' : ''}`}
            onClick={() => setSidebarView(item.id)}
          >
            {item.icon}
            {item.label}
            {item.badge && (
              <span style={{ marginLeft: 'auto', fontSize: 9, background: 'linear-gradient(135deg, #3B82F6, #7C3AED)', color: '#fff', padding: '2px 8px', borderRadius: 8, fontWeight: 700, letterSpacing: '.06em' }}>
                {item.badge}
              </span>
            )}
          </div>
        ))}
      </div>

      <div className="nav-section">
        <div className="nav-label">Account</div>
        {accountItems.map(item => (
          <div
            key={item.id}
            className={`nav-item ${sidebarView === item.id ? 'active' : ''}`}
            onClick={() => setSidebarView(item.id)}
          >
            {item.icon}
            {item.label}
          </div>
        ))}
        <div className="nav-item" onClick={() => signOut({ callbackUrl: '/' })}>
          <LogOut width={18} height={18} />
          Sign out
        </div>
      </div>

      <div className="sidebar-footer">
        <div className="user-card">
          <div className="avatar">{initials}</div>
          <div style={{ flex: 1 }}>
            <div className="name">{student?.name || 'Student'}</div>
            <div className="plan">Grade {student?.grade || 10} · {student?.board || ''}</div>
          </div>
          <MoreHorizontal width={16} height={16} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>
    </aside>
  );
}

// ============================================
// TOPBAR
// ============================================
function Topbar({ onRecord }: { onRecord: () => void }) {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const [searchQuery, setSearchQuery] = useState('');
  const { setSidebarView } = useStudyOS();

  return (
    <div className="topbar">
      <div className="search-box">
        <Search width={16} height={16} style={{ color: 'var(--text-muted)' }} />
        <input
          placeholder="Search lectures, notes, topics..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && searchQuery.trim()) {
              setSidebarView('search');
            }
          }}
        />
        <span className="kbd">⌘K</span>
      </div>
      {mounted && (
        <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} title="Toggle theme">
          {theme === 'dark' ? <Sun width={16} height={16} /> : <Moon width={16} height={16} />}
        </button>
      )}
      <button className="icon-btn" title="Notifications"><Bell width={16} height={16} /></button>
      <button className="btn primary" onClick={onRecord}><Plus width={15} height={15} />New Session</button>
    </div>
  );
}

// ============================================
// DASHBOARD VIEW
// ============================================
function DashboardView() {
  const { student, subjects, todayTasks, totalCompleted, totalTopics, focusScore, streak, performanceData } = useStudyOS();

  const completedToday = todayTasks.filter(t => t.completed).length;
  const studyMinutes = completedToday * 65;
  const studyHours = Math.floor(studyMinutes / 60);
  const studyMinsRem = studyMinutes % 60;
  const notesCount = totalCompleted * 4;
  const firstName = student?.name?.split(' ')[0] || 'Student';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const emoji = hour < 12 ? '🌅' : hour < 17 ? '☀️' : '🌙';

  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const now = new Date();
  const dateStr = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;

  // Weekly chart data from performanceData
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dayOfWeek = now.getDay();
  const weekData = weekDays.map((d, i) => {
    const perfEntry = performanceData.find(p => p.month === d);
    return { d, v: perfEntry ? perfEntry.lectures : Math.random() * 3 + 0.5, t: i === (dayOfWeek === 0 ? 6 : dayOfWeek - 1) };
  });
  const maxV = Math.max(...weekData.map(x => x.v), 1);

  const nextTask = todayTasks.find(t => !t.completed);

  return (
    <div className="view active">
      <div className="page-head">
        <div>
          <div className="crumbs">Home <span className="sep">/</span> <span className="cur">Dashboard</span></div>
          <h2 className="heading">{emoji} {greeting}, <span className="gradient-text">{firstName}</span>.</h2>
          <p>
            {nextTask
              ? <>Your next lecture is <em style={{ color: 'var(--text-primary)' }}>{nextTask.topicName}</em> in {nextTask.subjectName}. Keep going!</>
              : todayTasks.length > 0
                ? 'All today\'s lectures are complete! Great work 🎉'
                : 'No lectures scheduled for today. Start a study session or explore your courses.'
            }
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn ghost"><Download width={15} height={15} />Export Week</button>
        </div>
      </div>

      <div className="greeting glass">
        <h3 className="heading">{dateStr}</h3>
        <p>Day {student?.currentDay || 1} of {student?.totalDays || 438} — stay focused and make every lecture count.</p>
        <div className="greeting-meta">
          <div className="chip"><span className="dot" style={{ background: '#10B981' }}></span>{todayTasks.length} lectures today</div>
          <div className="chip"><span className="dot" style={{ background: '#7C3AED' }}></span>{todayTasks.filter(t => !t.completed).length} pending</div>
          <div className="chip"><span className="dot" style={{ background: '#F59E0B' }}></span>Streak: {streak} days</div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="label"><Mic width={13} height={13} />Lectures completed</div>
          <div className="value heading">{totalCompleted}</div>
          <div className="trend up"><TrendingUp width={12} height={12} />{getLecturesCopy(totalCompleted)}</div>
        </div>
        <div className="stat-card">
          <div className="label"><Clock width={13} height={13} />Hours reviewed</div>
          <div className="value heading">{studyHours}<small style={{ fontSize: 18, color: 'var(--text-muted)' }}>h</small>{studyMinsRem > 0 ? `${studyMinsRem}m` : ''}</div>
          <div className="trend up"><TrendingUp width={12} height={12} />{getHoursCopy(studyMinutes, totalCompleted)}</div>
        </div>
        <div className="stat-card">
          <div className="label"><BookMarked width={13} height={13} />Topics covered</div>
          <div className="value heading">{totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0}<small style={{ fontSize: 18, color: 'var(--text-muted)' }}>%</small></div>
          <div className="trend up"><TrendingUp width={12} height={12} />{getTopicsCopy(totalCompleted, totalTopics)}</div>
        </div>
        <div className="stat-card">
          <div className="label"><Brain width={13} height={13} />Focus score</div>
          <div className="value heading">{focusScore}<small style={{ fontSize: 18, color: 'var(--text-muted)' }}>%</small></div>
          <div className={`trend ${getFocusCopy(focusScore, totalCompleted).trendIcon}`}>
            {getFocusCopy(focusScore, totalCompleted).trendIcon === 'up' ? <TrendingUp width={12} height={12} /> : <TrendingDown width={12} height={12} />}
            {getFocusCopy(focusScore, totalCompleted).trendText}
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="panel glass">
          <div className="panel-head">
            <div>
              <h3 className="heading">Today&apos;s Lectures</h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>Your study queue for today</div>
            </div>
            <div className="actions">
              <button className="btn ghost btn-sm" onClick={() => useStudyOS.getState().setSidebarView('lectures')}>View all</button>
            </div>
          </div>
          <div className="panel-body">
            {todayTasks.slice(0, 5).map(task => (
              <LectureItem key={task.topicId} task={task} />
            ))}
            {todayTasks.length === 0 && (
              <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>
                No lectures scheduled. Enjoy your day off! 📚
              </div>
            )}
          </div>
        </div>

        <div className="panel glass">
          <div className="panel-head">
            <h3 className="heading">Study Activity</h3>
            <div className="actions" style={{ fontSize: 12, color: 'var(--text-muted)' }}>This week</div>
          </div>
          <div className="chart-wrap">
            <div className="chart">
              {weekData.map((w, i) => (
                <div key={i} className={`bar ${w.t ? 'today' : ''}`}>
                  <div className="fill" style={{ height: `${(w.v / maxV) * 100}%` }}></div>
                </div>
              ))}
            </div>
            <div className="chart-labels">
              {weekData.map((w, i) => (
                <div key={i} className={w.t ? 'today' : ''}>{w.d}</div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--border)', fontSize: 12, color: 'var(--text-muted)' }}>
              <span>Total this week: <b style={{ color: 'var(--text-primary)' }}>{studyHours}h {studyMinsRem}m</b></span>
              <span>Goal: {Math.ceil(totalTopics * 0.02)}h</span>
            </div>
          </div>
        </div>
      </div>

      <div className="panel glass" style={{ marginTop: 20 }}>
        <div className="panel-head">
          <h3 className="heading">Upcoming</h3>
          <button className="btn ghost btn-sm" onClick={() => useStudyOS.getState().setSidebarView('calendar')}>Calendar</button>
        </div>
        <div className="panel-body" style={{ padding: '16px 20px' }}>
          <div className="upcoming-list">
            {todayTasks.filter(t => !t.completed).slice(0, 5).map(task => (
              <div key={task.topicId} className="upcoming-item">
                <div className="time-block">
                  <div className="d">{new Date().getDate()}</div>
                  <div className="m">{months[now.getMonth()].slice(0, 3)}</div>
                </div>
                <div style={{ flex: 1 }}>
                  <h5>{task.topicName}</h5>
                  <p>{task.subjectName} · {task.chapterName}</p>
                </div>
              </div>
            ))}
            {todayTasks.filter(t => !t.completed).length === 0 && (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-muted)' }}>
                All done for today! 🎉
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// LECTURE ITEM (Reusable)
// ============================================
function LectureItem({ task, onClick }: { task: TodayTask; onClick?: () => void }) {
  const { toggleTaskComplete } = useStudyOS();
  const progressPct = task.completed ? 100 : 0;
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference * (1 - progressPct / 100);

  return (
    <div className="lecture-item" onClick={onClick}>
      <div className="lecture-play" onClick={e => { e.stopPropagation(); toggleTaskComplete(task.topicId); }}>
        {task.completed
          ? <CheckCircle2 width={16} height={16} />
          : <Play width={16} height={16} fill="currentColor" />
        }
      </div>
      <div className="lecture-info">
        <h4>{task.topicName}</h4>
        <div className="meta">
          <span className={`subject-tag ${getSubjectTagClass(task.subjectName)}`}>{task.subjectName}</span>
          <span><Clock width={12} height={12} />{task.duration} min</span>
          <span>{task.chapterName}</span>
        </div>
      </div>
      <div className="progress-ring">
        <svg width="44" height="44" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" fill="none" stroke="var(--border)" strokeWidth="3" />
          <circle cx="22" cy="22" r="18" fill="none" stroke={task.completed ? '#10B981' : '#7C3AED'} strokeWidth="3"
            strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" />
        </svg>
        <div className="pct">{task.completed ? '✓' : `${progressPct}%`}</div>
      </div>
    </div>
  );
}

// ============================================
// LECTURES VIEW
// ============================================
function LecturesView() {
  const { todayTasks, subjects } = useStudyOS();
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('all');

  const filteredTasks = activeFilter === 'all'
    ? todayTasks
    : todayTasks.filter(t => t.subjectName.toLowerCase().includes(activeFilter));

  const unreviewed = filteredTasks.filter(t => !t.completed);
  const completed = filteredTasks.filter(t => t.completed);

  const displayedTasks = activeTab === 'all' ? filteredTasks
    : activeTab === 'unreviewed' ? unreviewed
    : completed;

  return (
    <div className="view active">
      <div className="page-head">
        <div>
          <div className="crumbs">Workspace <span className="sep">/</span> <span className="cur">Lectures</span></div>
          <h2 className="heading">All Lectures</h2>
          <p>Browse, search and revisit every lecture in your study queue.</p>
        </div>
      </div>

      <div className="tabs">
        <div className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>All <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{todayTasks.length}</span></div>
        <div className={`tab ${activeTab === 'unreviewed' ? 'active' : ''}`} onClick={() => setActiveTab('unreviewed')}>Unreviewed <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{unreviewed.length}</span></div>
        <div className={`tab ${activeTab === 'completed' ? 'active' : ''}`} onClick={() => setActiveTab('completed')}>Completed <span style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{completed.length}</span></div>
      </div>

      <div className="filter-bar">
        <div className={`filter-chip ${activeFilter === 'all' ? 'active' : ''}`} onClick={() => setActiveFilter('all')}>All subjects</div>
        {subjects.map(s => (
          <div
            key={s.subjectId}
            className={`filter-chip ${activeFilter === s.subjectName.toLowerCase() ? 'active' : ''}`}
            onClick={() => setActiveFilter(s.subjectName.toLowerCase())}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: getSubjectColor(s.subjectName), display: 'inline-block' }}></span>
            {s.subjectName}
          </div>
        ))}
      </div>

      <div className="lectures-list glass">
        {displayedTasks.map(task => (
          <LectureItem key={task.topicId} task={task} onClick={() => {
            const subject = subjects.find(s => s.subjectName === task.subjectName);
            if (subject) {
              useStudyOS.getState().setHighlightTopicId(task.topicId);
              useStudyOS.getState().openSubjectDetail(subject.subjectId);
            }
          }} />
        ))}
        {displayedTasks.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)' }}>
            No lectures found. Try a different filter.
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// CALENDAR VIEW
// ============================================
function CalendarView() {
  const { todayTasks } = useStudyOS();
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const prevMonthDays = new Date(currentYear, currentMonth, 0).getDate();
  const today = new Date();

  // Build calendar grid
  const calDays: Array<{ day: number; isOther: boolean; isToday: boolean; events: string[] }> = [];
  for (let i = 0; i < firstDay; i++) {
    calDays.push({ day: prevMonthDays - firstDay + 1 + i, isOther: true, isToday: false, events: [] });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
    // Add events for days that have tasks
    const events: string[] = [];
    if (d === today.getDate() && isToday) {
      todayTasks.forEach(t => events.push(getSubjectColor(t.subjectName)));
    }
    calDays.push({ day: d, isOther: false, isToday, events: events.slice(0, 3) });
  }
  // Fill remaining cells
  const remaining = 42 - calDays.length;
  for (let i = 1; i <= remaining; i++) {
    calDays.push({ day: i, isOther: true, isToday: false, events: [] });
  }

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(currentYear - 1); }
    else setCurrentMonth(currentMonth - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(currentYear + 1); }
    else setCurrentMonth(currentMonth + 1);
  };
  const goToday = () => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); setSelectedDay(today.getDate()); };

  return (
    <div className="view active">
      <div className="page-head">
        <div>
          <div className="crumbs">Workspace <span className="sep">/</span> <span className="cur">Calendar</span></div>
          <h2 className="heading">{months[currentMonth]} {currentYear}</h2>
          <p>Your academic schedule and study sessions at a glance.</p>
        </div>
      </div>

      <div className="cal-wrap">
        <div className="cal-card glass">
          <div className="cal-head">
            <h3 className="heading">{months[currentMonth]} {currentYear}</h3>
            <div className="cal-nav">
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={prevMonth}><ChevronLeft width={14} height={14} /></button>
              <button className="btn ghost btn-sm" onClick={goToday}>Today</button>
              <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={nextMonth}><ChevronRight width={14} height={14} /></button>
            </div>
          </div>
          <div className="cal-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
              <div key={d} className="cal-dow">{d}</div>
            ))}
            {calDays.map((cd, i) => (
              <div
                key={i}
                className={`cal-day ${cd.isOther ? 'other' : ''} ${cd.isToday ? 'today' : ''} ${!cd.isOther && cd.day === selectedDay ? 'selected' : ''}`}
                onClick={() => !cd.isOther && setSelectedDay(cd.day)}
              >
                {cd.day}
                {cd.events.map((e, j) => <div key={j} className="ev" style={{ background: e }}></div>)}
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="cal-card glass" style={{ marginBottom: 16 }}>
            <div className="panel-head" style={{ padding: '0 0 14px', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
              <h3 className="heading" style={{ fontSize: 16 }}>Today&apos;s Schedule</h3>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{todayTasks.length} lectures</span>
            </div>
            <div className="upcoming-list">
              {todayTasks.filter(t => !t.completed).slice(0, 3).map(task => (
                <div key={task.topicId} className="upcoming-item">
                  <div className="time-block">
                    <div className="d">{today.getDate()}</div>
                    <div className="m">{months[currentMonth].slice(0, 3)}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h5>{task.topicName}</h5>
                    <p>{task.subjectName} · {task.chapterName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="cal-card glass">
            <div className="panel-head" style={{ padding: '0 0 14px', borderBottom: '1px solid var(--border)', marginBottom: 14 }}>
              <h3 className="heading" style={{ fontSize: 16 }}>This Week</h3>
            </div>
            <div className="upcoming-list">
              {todayTasks.slice(0, 4).map(task => (
                <div key={task.topicId} className="upcoming-item">
                  <div className="time-block">
                    <div className="d">{today.getDate()}</div>
                    <div className="m">{months[currentMonth].slice(0, 3)}</div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <h5>{task.topicName}</h5>
                    <p>{task.subjectName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SUBJECTS VIEW
// ============================================
function SubjectsView() {
  const { subjects, openSubjectDetail } = useStudyOS();

  return (
    <div className="view active">
      <div className="page-head">
        <div>
          <div className="crumbs">Workspace <span className="sep">/</span> <span className="cur">Subjects</span></div>
          <h2 className="heading">Subjects & Courses</h2>
          <p>Organise your study by subject and track mastery across the board.</p>
        </div>
      </div>

      <div className="subjects-grid">
        {subjects.map(s => (
          <div key={s.subjectId} className="subject-card glass" onClick={() => openSubjectDetail(s.subjectId)}>
            <div className="accent-bar" style={{ background: getSubjectColor(s.subjectName) }}></div>
            <div className="subject-icon" style={{ background: getSubjectColor(s.subjectName) }}>
              {getSubjectIcon(s.subjectName)}
            </div>
            <h4>{s.subjectName}</h4>
            <div className="sub">{s.totalTopics} topics · {s.chapterCount} chapters</div>
            <div className="stats">
              <div className="s">
                <div className="n">{s.completedTopics}</div>
                <div className="l">Completed</div>
              </div>
              <div className="s">
                <div className="n">{s.progressPct}%</div>
                <div className="l">Mastery</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// INSIGHTS VIEW
// ============================================
function InsightsView() {
  const { subjects, focusScore, streak, totalCompleted, totalTopics, todayTasks, student } = useStudyOS();

  // Find weakest subject
  const weakestSubject = subjects.length > 0
    ? subjects.reduce((min, s) => s.progressPct < min.progressPct ? s : min, subjects[0])
    : null;
  const strongestSubject = subjects.length > 0
    ? subjects.reduce((max, s) => s.progressPct > max.progressPct ? s : max, subjects[0])
    : null;

  // Build recommendations from incomplete tasks
  const recommendations = todayTasks.filter(t => !t.completed).slice(0, 3);

  return (
    <div className="view active">
      <div className="page-head">
        <div>
          <div className="crumbs">Intelligence <span className="sep">/</span> <span className="cur">AI Insights</span></div>
          <h2 className="heading">Your Study Intelligence</h2>
          <p>Patterns, recommendations and summaries generated from your progress data.</p>
        </div>
      </div>

      <div className="insights-grid">
        <div className="insight-card glass">
          <h4>Focus Score</h4>
          <p>How engaged you&apos;ve been with your study schedule this week.</p>
          <div className="big">{focusScore}<small>/100</small></div>
          <div className={`trend ${getInsightFocusCopy(focusScore, totalCompleted) === 'Room to improve' || getInsightFocusCopy(focusScore, totalCompleted) === "Let's pick up the pace" ? 'down' : 'up'}`}>
            {(getInsightFocusCopy(focusScore, totalCompleted) === 'Room to improve' || getInsightFocusCopy(focusScore, totalCompleted) === "Let's pick up the pace") ? <TrendingDown width={12} height={12} /> : <TrendingUp width={12} height={12} />}
            {getInsightFocusCopy(focusScore, totalCompleted)}
          </div>
        </div>
        <div className="insight-card glass">
          <h4>Consistency</h4>
          <p>Your current streak of daily study sessions.</p>
          <div className="big">{streak}<small>days</small></div>
          <div className="trend up">{getStreakCopy(streak, totalCompleted)}</div>
        </div>
        <div className="insight-card glass">
          <h4>Progress Overview</h4>
          <p>Your subject completion rates at a glance.</p>
          <div style={{ marginTop: 14 }}>
            {subjects.map(s => (
              <div key={s.subjectId} style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                  <span>{s.subjectName}</span>
                  <span style={{ color: s.progressPct >= 50 ? '#10B981' : '#7C3AED', fontWeight: 600 }}>{s.progressPct}%</span>
                </div>
                <div className="progress-bar-track">
                  <div className="progress-bar-fill" style={{ width: `${s.progressPct}%`, background: s.progressPct >= 50 ? '#10B981' : '#7C3AED' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="insight-card glass">
          <h4>Recommended Next</h4>
          <p>Based on your pacing, study these topics today:</p>
          <div className="key-points" style={{ marginTop: 14 }}>
            {recommendations.map((r, i) => (
              <div key={r.topicId} className="key-point">
                <div className="bullet">{i + 1}</div>
                <div>{r.topicName} — <em style={{ color: 'var(--text-muted)' }}>{r.subjectName}</em></div>
              </div>
            ))}
            {recommendations.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>All caught up! No pending recommendations.</div>
            )}
          </div>
        </div>
        <div className="insight-card quote-card glass">
          <span className="ai-badge"><Sparkles width={10} height={10} />AI reflection</span>
          <blockquote style={{ marginTop: 14 }}>
            {getAIReflectionCopy(focusScore, totalCompleted)}
          </blockquote>
          <div className="src">— Generated from your study data</div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SEARCH VIEW
// ============================================
function SearchView() {
  const { subjects, todayTasks } = useStudyOS();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    const found: Array<{ name: string; subject: string; type: string }> = [];
    todayTasks.forEach(t => {
      if (t.topicName.toLowerCase().includes(q) || t.subjectName.toLowerCase().includes(q) || t.chapterName.toLowerCase().includes(q)) {
        found.push({ name: t.topicName, subject: t.subjectName, type: 'Topic' });
      }
    });
    subjects.forEach(s => {
      if (s.subjectName.toLowerCase().includes(q)) {
        found.push({ name: s.subjectName, subject: s.subjectName, type: 'Subject' });
      }
    });
    return found.slice(0, 10);
  }, [query, todayTasks, subjects]);

  return (
    <div className="view active">
      <div className="page-head">
        <div>
          <div className="crumbs">Intelligence <span className="sep">/</span> <span className="cur">Search</span></div>
          <h2 className="heading">Search Everything</h2>
          <p>Ask a question or search across topics, subjects and chapters.</p>
        </div>
      </div>
      <div style={{ maxWidth: 640 }}>
        <div className="search-box glass" style={{ maxWidth: 'none', padding: '14px 18px' }}>
          <Search width={18} height={18} style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder="Ask anything — e.g. 'Simple Harmonic Motion'"
            style={{ fontSize: 15 }}
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoFocus
          />
          <span className="kbd">⏎</span>
        </div>

        {results.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12, fontWeight: 600 }}>
              Results ({results.length})
            </div>
            {results.map((r, i) => (
              <div key={i} className="lecture-item glass" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginTop: 6 }}>
                <Search width={16} height={16} style={{ color: 'var(--text-muted)' }} />
                <div style={{ fontSize: 13.5 }}>
                  <div>{r.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.subject} · {r.type}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {query && results.length === 0 && (
          <div style={{ marginTop: 22, color: 'var(--text-muted)', fontSize: 13 }}>No results found for &ldquo;{query}&rdquo;</div>
        )}

        {!query && (
          <div style={{ marginTop: 22 }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 12, fontWeight: 600 }}>Quick Access</div>
            {subjects.map(s => (
              <div key={s.subjectId} className="lecture-item glass" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginTop: 6, cursor: 'pointer' }}
                onClick={() => { useStudyOS.getState().openSubjectDetail(s.subjectId); }}>
                <div className="subject-icon" style={{ background: getSubjectColor(s.subjectName), width: 32, height: 32, borderRadius: 8 }}>
                  {getSubjectIcon(s.subjectName)}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.subjectName}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.totalTopics} topics · {s.progressPct}% done</div>
                </div>
                <ChevronRightIcon width={16} height={16} style={{ color: 'var(--text-muted)' }} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// SETTINGS VIEW
// ============================================
function SettingsView() {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const [toggles, setToggles] = useState({
    autoProgress: true,
    dailyReminders: true,
    aiInsights: true,
    darkMode: theme === 'dark',
    sync: true,
  });
  const [activeSettingsTab, setActiveSettingsTab] = useState('notifications');

  const toggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: !prev[key] }));
    if (key === 'darkMode') {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  };

  const settingsTabs = [
    { id: 'notifications', label: 'Notifications', icon: <Bell width={16} height={16} /> },
    { id: 'recording', label: 'Recording', icon: <Mic width={16} height={16} /> },
    { id: 'appearance', label: 'Appearance', icon: <Settings width={16} height={16} /> },
    { id: 'help', label: 'Help', icon: <LifeBuoy width={16} height={16} /> },
  ];

  return (
    <div className="view active">
      <div className="page-head">
        <div>
          <div className="crumbs">Account <span className="sep">/</span> <span className="cur">Settings</span></div>
          <h2 className="heading">Settings</h2>
          <p>Customise your Lecture Diary experience.</p>
        </div>
      </div>

      <div className="settings-grid">
        <div className="settings-nav">
          {settingsTabs.map(tab => (
            <div
              key={tab.id}
              className={`nav-item ${activeSettingsTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveSettingsTab(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </div>
          ))}
        </div>

        <div className="cal-card glass">
          <div className="setting-row">
            <div className="info">
              <h4>Auto-track progress</h4>
              <p>Automatically mark lectures as completed when you finish studying.</p>
            </div>
            <div className={`toggle ${toggles.autoProgress ? 'on' : ''}`} onClick={() => toggle('autoProgress')}></div>
          </div>
          <div className="setting-row">
            <div className="info">
              <h4>Daily review reminders</h4>
              <p>Get gentle nudges to review previous lectures using spaced repetition.</p>
            </div>
            <div className={`toggle ${toggles.dailyReminders ? 'on' : ''}`} onClick={() => toggle('dailyReminders')}></div>
          </div>
          <div className="setting-row">
            <div className="info">
              <h4>Generate AI insights</h4>
              <p>Automatically create study recommendations and focus analysis.</p>
            </div>
            <div className={`toggle ${toggles.aiInsights ? 'on' : ''}`} onClick={() => toggle('aiInsights')}></div>
          </div>
          <div className="setting-row">
            <div className="info">
              <h4>Dark mode</h4>
              <p>Switch between light and dark themes for comfortable reading.</p>
            </div>
            <div className={`toggle ${toggles.darkMode ? 'on' : ''}`} onClick={() => toggle('darkMode')}></div>
          </div>
          <div className="setting-row">
            <div className="info">
              <h4>Sync with Google Sheets</h4>
              <p>Keep your data in sync with the live Google Sheet.</p>
            </div>
            <div className={`toggle ${toggles.sync ? 'on' : ''}`} onClick={() => toggle('sync')}></div>
          </div>

        </div>
      </div>
    </div>
  );
}

// ============================================
// STUDY SESSION MODAL
// ============================================
function StudySessionModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { subjects } = useStudyOS();
  const [selectedSubject, setSelectedSubject] = useState('');

  const toggleRecord = () => {
    if (recording) {
      setRecording(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      setRecording(true);
      intervalRef.current = setInterval(() => setSeconds(s => s + 1), 1000);
    }
  };

  const handleClose = () => {
    setRecording(false);
    setSeconds(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
    onClose();
  };

  const formatTime = (s: number) => {
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const sec = String(s % 60).padStart(2, '0');
    return `${m}:${sec}`;
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay show" onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal glass-strong">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 className="heading">Study Session</h3>
            <p>Start a focused study session with a timer.</p>
          </div>
          <button className="icon-btn" onClick={handleClose}><X width={16} height={16} /></button>
        </div>

        <div className="rec-circle" onClick={toggleRecord} style={recording ? {} : {}}>
          <div className="inner" style={recording ? { background: 'var(--accent-hover)' } : {}}>
            {recording ? <Zap width={28} height={28} /> : <Mic width={28} height={28} />}
          </div>
        </div>
        <div className="rec-time mono">{formatTime(seconds)}</div>
        <div className="rec-status">
          {recording
            ? <><span className="dot"></span>Session in progress</>
            : seconds > 0
              ? 'Paused — tap to resume'
              : 'Tap to start session'
          }
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, height: 40, background: 'var(--bg-secondary)', borderRadius: 10, padding: '0 16px', margin: '14px 0', border: '1px solid var(--border)' }}>
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className={`wave-bar ${recording && i < (seconds % 40) ? 'active' : ''}`}
              style={{ height: `${20 + Math.random() * 60}%` }}
            ></div>
          ))}
        </div>

        <div className="form-row">
          <label>Topic</label>
          <input placeholder="e.g. Simple Harmonic Motion — Chapter 1" />
        </div>
        <div className="form-row">
          <label>Subject</label>
          <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}>
            <option value="">Select subject...</option>
            {subjects.map(s => (
              <option key={s.subjectId} value={s.subjectId}>{s.subjectName}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button className="btn ghost" style={{ flex: 1 }} onClick={handleClose}>Cancel</button>
          <button className="btn primary" style={{ flex: 1 }} onClick={toggleRecord}>
            {recording ? 'Pause' : 'Start Session'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SUBJECT DETAIL VIEW
// ============================================
function SubjectDetailView() {
  const { subjectDetail, subjectDetailLoading, closeSubjectDetail, toggleSubjectDetailTopic, highlightTopicId, setHighlightTopicId } = useStudyOS();
  const topicRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (highlightTopicId && topicRefs.current[highlightTopicId]) {
      setTimeout(() => {
        topicRefs.current[highlightTopicId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setHighlightTopicId(null);
      }, 300);
    }
  }, [highlightTopicId, setHighlightTopicId]);

  if (subjectDetailLoading) {
    return (
      <div className="view active" style={{ padding: 40, textAlign: 'center' }}>
        <Loader2 className="animate-spin" style={{ margin: '0 auto', color: 'var(--accent)' }} width={32} height={32} />
        <p style={{ marginTop: 16, color: 'var(--text-muted)' }}>Loading subject details...</p>
      </div>
    );
  }

  if (!subjectDetail) return null;

  const color = getSubjectColor(subjectDetail.name);
  const totalProgress = subjectDetail.totalTopics > 0
    ? Math.round((subjectDetail.completedTopics / subjectDetail.totalTopics) * 100)
    : 0;

  return (
    <div className="view active">
      <div className="page-head">
        <div>
          <div className="crumbs">
            <span style={{ cursor: 'pointer' }} onClick={closeSubjectDetail}>Subjects</span>
            <span className="sep">/</span>
            <span className="cur">{subjectDetail.name}</span>
          </div>
          <h2 className="heading" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="subject-icon" style={{ background: color, width: 44, height: 44, borderRadius: 12 }}>
              {getSubjectIcon(subjectDetail.name)}
            </div>
            {subjectDetail.name}
          </h2>
          <p>{subjectDetail.chapterCount} chapters · {subjectDetail.totalTopics} topics · <span className="gradient-text">{totalProgress}%</span> complete</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn ghost" onClick={closeSubjectDetail}><ChevronLeft width={15} height={15} />Back</button>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 600 }}>Overall Progress</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED' }}>{subjectDetail.completedTopics}/{subjectDetail.totalTopics}</span>
        </div>
        <div className="progress-bar-track" style={{ height: 8 }}>
          <div className="progress-bar-fill" style={{ width: `${totalProgress}%`, background: `linear-gradient(90deg, ${color}, #7C3AED)` }}></div>
        </div>
      </div>

      {/* Chapters */}
      {subjectDetail.chapters.map(ch => (
        <div key={ch.id} className="panel glass" style={{ marginBottom: 16 }}>
          <div className="panel-head">
            <div>
              <h3 className="heading" style={{ fontSize: 16 }}>Ch {ch.number}: {ch.name}</h3>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{ch.completedTopics}/{ch.totalTopics} completed</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="progress-bar-track" style={{ width: 80, height: 5 }}>
                <div className="progress-bar-fill" style={{ width: `${ch.totalTopics > 0 ? (ch.completedTopics / ch.totalTopics) * 100 : 0}%`, background: color }}></div>
              </div>
              <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ch.totalTopics > 0 ? Math.round((ch.completedTopics / ch.totalTopics) * 100) : 0}%</span>
            </div>
          </div>
          <div className="panel-body" style={{ padding: '4px 8px' }}>
            {ch.topics.map(t => (
              <div
                key={t.id}
                ref={el => { topicRefs.current[t.id] = el; }}
                className="lecture-item"
                style={{
                  background: highlightTopicId === t.id ? 'var(--accent-soft)' : undefined,
                  transition: 'background .3s',
                }}
                onClick={() => toggleSubjectDetailTopic(t.id)}
              >
                <div className="lecture-play" style={{
                  background: t.completed ? 'rgba(16,185,129,.12)' : 'var(--accent-soft)',
                  color: t.completed ? '#10B981' : '#7C3AED',
                }}>
                  {t.completed ? <CheckCircle2 width={16} height={16} /> : <Play width={16} height={16} fill="currentColor" />}
                </div>
                <div className="lecture-info">
                  <h4>{t.number}. {t.name}</h4>
                  <div className="meta">
                    <span>Day {t.dayNumber}</span>
                    {t.hasVideo && (
                      <a href={t.videoLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                          bg-rose-500/10 text-rose-400 border border-rose-500/20
                          hover:bg-rose-500/20 hover:border-rose-500/40 hover:text-rose-300
                          transition-all duration-200 active:scale-95">
                        <Play width={10} height={10} fill="currentColor" />Video
                      </a>
                    )}
                    {t.hasPdf && (
                      <a href={t.pdfLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider
                          bg-emerald-500/10 text-emerald-400 border border-emerald-500/20
                          hover:bg-emerald-500/20 hover:border-emerald-500/40 hover:text-emerald-300
                          transition-all duration-200 active:scale-95">
                        <FileText width={10} height={10} />PDF
                      </a>
                    )}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: t.completed ? '#10B981' : 'var(--text-muted)', fontWeight: 600 }}>
                  {t.completed ? 'Done' : 'To do'}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// MOBILE BOTTOM NAV (Floating Premium Design)
// ============================================
function MobileBottomNav() {
  const { sidebarView, setSidebarView } = useStudyOS();

  const items: { id: ViewId; icon: React.ReactNode; label: string }[] = [
    { id: 'dashboard', icon: <LayoutDashboard width={18} height={18} />, label: 'Dashboard' },
    { id: 'lectures', icon: <BookOpen width={18} height={18} />, label: 'Lectures' },
    { id: 'calendar', icon: <CalendarDays width={18} height={18} />, label: 'Calendar' },
    { id: 'subjects', icon: <Library width={18} height={18} />, label: 'Subjects' },
    { id: 'insights', icon: <Sparkles width={18} height={18} />, label: 'Insights' },
  ];

  return (
    <nav className="mobile-nav">
      {items.map(item => (
        <div
          key={item.id}
          className={`mobile-nav-item ${sidebarView === item.id ? 'active' : ''}`}
          onClick={() => setSidebarView(item.id)}
        >
          {item.icon}
          {item.label}
        </div>
      ))}
    </nav>
  );
}

// ============================================
// LOADING STATES
// ============================================
function AuthLoadingScreen() {
  return (
    <div className="auth-loading">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div className="brand-mark" style={{ width: 48, height: 48 }}><BookOpenText width={22} height={22} /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
          <Loader2 width={16} height={16} className="animate-spin" />
          <span style={{ fontSize: 13, fontFamily: 'var(--font-jetbrains-mono), monospace' }}>Loading session...</span>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="loading-skeleton">
      <div style={{ display: 'none', md: 'flex', flexDirection: 'column', width: 260, borderRight: '1px solid var(--border)', padding: 20, gap: 16 }}>
        <div style={{ width: '100%', height: 40, background: 'var(--surface)', borderRadius: 10 }} className="shimmer" />
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{ width: '100%', height: 36, background: 'var(--surface)', borderRadius: 8 }} className="shimmer" />
        ))}
      </div>
      <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ height: 140, background: 'var(--surface)', borderRadius: 22 }} className="shimmer" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{ height: 80, background: 'var(--surface)', borderRadius: 14 }} className="shimmer" />
          ))}
        </div>
        <div style={{ height: 200, background: 'var(--surface)', borderRadius: 14 }} className="shimmer" />
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE
// ============================================
export default function Home() {
  const { data: session, status } = useSession();
  const { fetchData, isLoading, selectedSubjectId, student, sidebarView } = useStudyOS();
  const [sessionModalOpen, setSessionModalOpen] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const sessionPhone = (session.user as Record<string, unknown>).phone as string;
      fetchData(sessionPhone);
    }
  }, [fetchData, status, session]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useStudyOS.getState().setSidebarView('search');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
        e.preventDefault();
        setSessionModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (status === 'loading') return <AuthLoadingScreen />;
  if (status === 'unauthenticated' || !session) return <LoginPage />;
  if (isLoading) return <LoadingSkeleton />;

  return (
    <>
      <div className="app-shell">
        <Sidebar />
        <div className="main-premium">
          <Topbar onRecord={() => setSessionModalOpen(true)} />
          <div className="content-area">
            {selectedSubjectId ? (
              <SubjectDetailView />
            ) : (
              <>
                {sidebarView === 'dashboard' && <DashboardView />}
                {sidebarView === 'lectures' && <LecturesView />}
                {sidebarView === 'calendar' && <CalendarView />}
                {sidebarView === 'subjects' && <SubjectsView />}
                {sidebarView === 'insights' && <InsightsView />}
                {sidebarView === 'search' && <SearchView />}
                {sidebarView === 'settings' && <SettingsView />}
              </>
            )}
          </div>
        </div>
      </div>
      <MobileBottomNav />
      <StudySessionModal isOpen={sessionModalOpen} onClose={() => setSessionModalOpen(false)} />
      <div className="shortcut-hint">
        <kbd>⌘</kbd><kbd>K</kbd> Search
        <span style={{ opacity: .4 }}>·</span>
        <kbd>⌘</kbd><kbd>R</kbd> Session
      </div>
    </>
  );
}
