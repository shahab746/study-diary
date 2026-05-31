'use client';

import { motion } from 'framer-motion';
import { useStudyOS } from '@/lib/store';
import { Target, Clock, Flame, Calendar } from 'lucide-react';

export function StatsGrid() {
  const { focusScore, streak, programWeek, weeksLeft, todayTasks } = useStudyOS();
  
  const completedToday = todayTasks.filter(t => t.completed).length;
  const totalToday = todayTasks.length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Focus Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0 }}
        className="glass rounded-xl p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Target className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground tracking-wider">FOCUS SCORE</span>
        </div>
        <p className="text-2xl font-display font-bold">{focusScore}%</p>
        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
          {completedToday}/{totalToday} today&apos;s tasks done
        </p>
      </motion.div>

      {/* Study Time */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="glass rounded-xl p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground tracking-wider">STUDY TIME</span>
        </div>
        <p className="text-2xl font-display font-bold">
          {Math.floor(completedToday * 65 / 60)}h {(completedToday * 65) % 60}m
        </p>
        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">logged today</p>
      </motion.div>

      {/* Streak */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass rounded-xl p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Flame className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground tracking-wider">STREAK</span>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-2xl font-display font-bold">{streak}</p>
          {streak > 0 && (
            <Flame className="w-5 h-5 text-primary" />
          )}
        </div>
        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">days in a row</p>
      </motion.div>

      {/* Program Week */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="glass rounded-xl p-4"
      >
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <Calendar className="w-4 h-4" />
          </div>
          <span className="text-[10px] font-mono text-muted-foreground tracking-wider">PROGRAM WEEK</span>
        </div>
        <p className="text-2xl font-display font-bold text-primary">W{programWeek}</p>
        <p className="text-[10px] text-primary/70 font-mono mt-0.5">{weeksLeft} weeks left</p>
        {/* Mini progress bar */}
        <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, (programWeek / (programWeek + weeksLeft)) * 100)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </motion.div>
    </div>
  );
}
