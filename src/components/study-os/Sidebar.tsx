'use client';

import { motion } from 'framer-motion';
import { useStudyOS } from '@/lib/store';
import { Home, ListTodo, BookOpen, Calendar, Timer, Download, Moon, Sun, Zap, LogOut, Sparkles } from 'lucide-react';
import { useTheme } from 'next-themes';
import { signOut } from 'next-auth/react';
import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

type SidebarView = 'today' | 'tasks' | 'courses' | 'schedule';

const NAV_ITEMS: { id: SidebarView; label: string; icon: React.ReactNode }[] = [
  { id: 'today', label: 'Today', icon: <Home className="w-4 h-4" /> },
  { id: 'tasks', label: 'Tasks', icon: <ListTodo className="w-4 h-4" /> },
  { id: 'courses', label: 'Courses', icon: <BookOpen className="w-4 h-4" /> },
  { id: 'schedule', label: 'Schedule', icon: <Calendar className="w-4 h-4" /> },
];

export function Sidebar() {
  const { student, totalCompleted, totalTopics, sidebarView, setSidebarView, isFreeUser } = useStudyOS();
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const overallPct = totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0;

  return (
    <aside className="hidden md:flex flex-col w-56 lg:w-64 border-r border-border bg-sidebar h-screen sticky top-0 flex-shrink-0">
      {/* Logo Section */}
      <div className="p-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shadow-lg shadow-primary/10"
          >
            <Zap className="w-5 h-5 text-primary" />
          </motion.div>
          <div>
            <h1 className="font-display text-base font-bold tracking-tight">
              Study<span className="gradient-text">Diary</span>
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-[8px] text-white font-bold shadow-sm">
                {student?.name?.charAt(0) || 'S'}
              </div>
              <span className="text-xs font-medium text-foreground">{student?.name || 'Student'}</span>
            </div>
            {/* Status badge */}
            {isFreeUser && (
              <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30">
                FREE PLAN
              </span>
            )}
          </div>
        </div>

        {/* Mini overall progress */}
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${overallPct}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
          <span className="text-[9px] font-mono text-muted-foreground flex-shrink-0">
            {totalCompleted}/{totalTopics}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = sidebarView === item.id;
          return (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.97 }}
              whileHover={{ x: 2 }}
              onClick={() => setSidebarView(item.id)}
              className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <span className={isActive ? 'text-primary' : ''}>{item.icon}</span>
              <span>{item.label}</span>
              {item.id === 'today' && (
                <Sparkles className="w-3 h-3 text-primary/50 ml-auto" />
              )}
            </motion.button>
          );
        })}
      </nav>

      {/* Bottom Utilities */}
      <div className="p-3 border-t border-border space-y-1">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200">
          <Timer className="w-4 h-4" />
          <span>Focus timer</span>
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200">
          <Download className="w-4 h-4" />
          <span>Export notes</span>
        </button>
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-all duration-200"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
          </button>
        )}
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
