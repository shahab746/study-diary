'use client';

import { useTheme } from 'next-themes';
import { motion } from 'framer-motion';
import { Sun, Moon, Zap } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { useStudyOS } from '@/lib/store';

const emptySubscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function Header() {
  const { theme, setTheme } = useTheme();
  const { student, totalCompleted, totalTopics } = useStudyOS();
  const mounted = useMounted();

  const overallPct = totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0;

  return (
    <header className="glass sticky top-0 z-50 border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Logo + Title */}
          <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"
            >
              <Zap className="w-5 h-5 text-primary" />
            </motion.div>
            <div>
              <h1 className="font-display text-base font-bold tracking-tight leading-none">
                Study OS
              </h1>
              <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                {student?.name || 'Student'} · Grade {student?.grade || 10} · {student?.field || 'Science'}
              </p>
            </div>
          </div>

          {/* Center - Overall progress */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs font-mono text-muted-foreground">OVERALL PROGRESS</p>
              <p className="font-display font-bold text-sm">
                {totalCompleted}<span className="text-muted-foreground">/{totalTopics}</span>
                <span className="text-primary ml-1.5">{overallPct}%</span>
              </p>
            </div>
            <div className="w-24 h-2 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${overallPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </div>

          {/* Right - Theme toggle */}
          <div className="flex items-center gap-2">
            {mounted && (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
