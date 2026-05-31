'use client';

import { motion } from 'framer-motion';
import { useStudyOS } from '@/lib/store';
import { Home, ListTodo, BookOpen, Calendar, Timer, Download, Moon, Sun, Zap, LogOut } from 'lucide-react';
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

  return (
    <aside className="hidden md:flex flex-col w-56 lg:w-64 border-r border-border bg-sidebar h-screen sticky top-0 flex-shrink-0">
      {/* Logo Section */}
      <div className="p-4 pb-3 border-b border-border">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center"
          >
            <Zap className="w-5 h-5 text-primary" />
          </motion.div>
          <div>
            <h1 className="font-display text-base font-bold tracking-tight">LectureDiary</h1>
            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-[8px] text-white font-bold">
                {student?.name?.charAt(0) || 'S'}
              </div>
              <span className="text-xs font-medium text-foreground">{student?.name || 'Student'}</span>
              <span className="text-[10px] text-muted-foreground font-mono">{totalCompleted} Lec</span>
            </div>
            {/* Status badge */}
            {isFreeUser && (
              <span className="inline-flex items-center mt-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold tracking-wider bg-amber-500/15 text-amber-500 border border-amber-500/30">
                FREE PLAN
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map(item => (
          <motion.button
            key={item.id}
            whileTap={{ scale: 0.97 }}
            onClick={() => setSidebarView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              sidebarView === item.id
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
          </motion.button>
        ))}
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
