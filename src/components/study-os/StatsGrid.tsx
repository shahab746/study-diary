'use client';

import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useStudyOS } from '@/lib/store';
import { Target, Clock, Flame, Calendar } from 'lucide-react';
import { useEffect, useRef } from 'react';

// Color configuration per stat card
const STAT_COLORS = {
  focus: { main: '#f59e0b', light: '#fbbf24', bg: 'bg-amber-500/10', text: 'text-amber-500' },
  studyTime: { main: '#14b8a6', light: '#2dd4bf', bg: 'bg-teal-500/10', text: 'text-teal-500' },
  streak: { main: '#ef4444', light: '#f97316', bg: 'bg-red-500/10', text: 'text-red-500' },
  programWeek: { main: '#3b82f6', light: '#60a5fa', bg: 'bg-blue-500/10', text: 'text-blue-500' },
} as const;

// Mini SVG arc progress indicator
function MiniArcProgress({ progress, color, id }: { progress: number; color: keyof typeof STAT_COLORS; id: string }) {
  const colors = STAT_COLORS[color];
  const radius = 12;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <svg className="w-8 h-8 -rotate-90" viewBox="0 0 28 28">
      <circle
        cx="14" cy="14" r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        className="text-muted/20"
      />
      <motion.circle
        cx="14" cy="14" r={radius}
        fill="none"
        stroke={`url(#mini-arc-${id})`}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
      <defs>
        <linearGradient id={`mini-arc-${id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={colors.main} />
          <stop offset="100%" stopColor={colors.light} stopOpacity={0.7} />
        </linearGradient>
      </defs>
    </svg>
  );
}

// Animated counter component using motion values (no setState in effect)
function AnimatedNumber({ value, duration = 1.2, className }: { value: number; duration?: number; className?: string }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (!hasAnimated.current) {
      hasAnimated.current = true;
      const controls = animate(motionVal, value, { duration, ease: 'easeOut' });
      return () => controls.stop();
    } else {
      motionVal.set(value);
    }
  }, [value, motionVal, duration]);

  return (
    <motion.span className={className}>{rounded}</motion.span>
  );
}

export function StatsGrid() {
  const { focusScore, streak, programWeek, weeksLeft, todayTasks } = useStudyOS();

  const completedToday = todayTasks.filter(t => t.completed).length;
  const totalToday = todayTasks.length;

  // Study time calculation
  const studyMinutes = completedToday * 65;
  const studyHours = Math.floor(studyMinutes / 60);
  const studyMinsRem = studyMinutes % 60;

  // Progress values for mini arcs
  const focusProgress = focusScore; // 0-100
  const studyTimeProgress = Math.min(100, (studyMinutes / 240) * 100); // 4h = 100%
  const streakProgress = Math.min(100, (streak / 30) * 100); // 30 days = 100%
  const weekProgress = programWeek + weeksLeft > 0 ? (programWeek / (programWeek + weeksLeft)) * 100 : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {/* Focus Score */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0 }}
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
        className="glass rounded-xl p-4 cursor-default group"
        style={{ transition: 'box-shadow 0.2s ease' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px rgba(0,0,0,0.1), 0 0 15px ${STAT_COLORS.focus.main}20`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = '';
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg ${STAT_COLORS.focus.bg} flex items-center justify-center ${STAT_COLORS.focus.text}`}>
              <Target className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground tracking-wider">FOCUS</span>
          </div>
          <MiniArcProgress progress={focusProgress} color="focus" id="focus" />
        </div>
        <p className={`text-2xl font-display font-bold ${STAT_COLORS.focus.text}`}>
          <AnimatedNumber value={focusScore} />%
        </p>
        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
          {completedToday}/{totalToday} today&apos;s tasks done
        </p>
      </motion.div>

      {/* Study Time */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
        className="glass rounded-xl p-4 cursor-default"
        style={{ transition: 'box-shadow 0.2s ease' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px rgba(0,0,0,0.1), 0 0 15px ${STAT_COLORS.studyTime.main}20`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = '';
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg ${STAT_COLORS.studyTime.bg} flex items-center justify-center ${STAT_COLORS.studyTime.text}`}>
              <Clock className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground tracking-wider">STUDY TIME</span>
          </div>
          <MiniArcProgress progress={studyTimeProgress} color="studyTime" id="study-time" />
        </div>
        <p className={`text-2xl font-display font-bold ${STAT_COLORS.studyTime.text}`}>
          <AnimatedNumber value={studyHours} duration={0.8} />h {studyMinsRem}m
        </p>
        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">logged today</p>
      </motion.div>

      {/* Streak */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
        className="glass rounded-xl p-4 cursor-default"
        style={{ transition: 'box-shadow 0.2s ease' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px rgba(0,0,0,0.1), 0 0 15px ${STAT_COLORS.streak.main}20`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = '';
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg ${STAT_COLORS.streak.bg} flex items-center justify-center ${STAT_COLORS.streak.text}`}>
              <Flame className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground tracking-wider">STREAK</span>
          </div>
          <MiniArcProgress progress={streakProgress} color="streak" id="streak" />
        </div>
        <div className="flex items-center gap-2">
          <p className={`text-2xl font-display font-bold ${streak > 0 ? STAT_COLORS.streak.text : ''}`}>
            <AnimatedNumber value={streak} />
          </p>
          {streak > 0 && (
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 15, delay: 0.5 }}
            >
              <Flame className="w-5 h-5 text-red-500" />
            </motion.span>
          )}
        </div>
        {streak === 0 ? (
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">Start your streak today! 🔥</p>
        ) : (
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">days in a row</p>
        )}
      </motion.div>

      {/* Program Week */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        whileHover={{ y: -3, transition: { duration: 0.2 } }}
        className="glass rounded-xl p-4 cursor-default"
        style={{ transition: 'box-shadow 0.2s ease' }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 30px rgba(0,0,0,0.1), 0 0 15px ${STAT_COLORS.programWeek.main}20`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow = '';
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg ${STAT_COLORS.programWeek.bg} flex items-center justify-center ${STAT_COLORS.programWeek.text}`}>
              <Calendar className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-mono text-muted-foreground tracking-wider">WEEK</span>
          </div>
          <MiniArcProgress progress={weekProgress} color="programWeek" id="program-week" />
        </div>
        <p className={`text-2xl font-display font-bold ${STAT_COLORS.programWeek.text}`}>
          W<AnimatedNumber value={programWeek} />
        </p>
        <p className={`text-[10px] ${STAT_COLORS.programWeek.text} font-mono mt-0.5 opacity-70`}>{weeksLeft} weeks left</p>
        {/* Mini progress bar */}
        <div className="mt-2 h-1 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${STAT_COLORS.programWeek.main}, ${STAT_COLORS.programWeek.light})` }}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(100, weekProgress)}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
      </motion.div>
    </div>
  );
}
