'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useStudyOS, TodayTask } from '@/lib/store';
import { useState, useRef } from 'react';
import { Check, Clock, MoreHorizontal, Play, FileText, Plus, Target, Sparkles } from 'lucide-react';

const PRIORITY_STYLES: Record<string, { dot: string; label: string; text: string }> = {
  high: {
    dot: 'bg-red-500',
    label: 'HIGH PRIORITY',
    text: 'text-red-500',
  },
  medium: {
    dot: 'bg-amber-500',
    label: 'MEDIUM PRIORITY',
    text: 'text-amber-500',
  },
  low: {
    dot: 'bg-muted-foreground/40',
    label: 'LOW PRIORITY',
    text: 'text-muted-foreground',
  },
};

const COLOR_TAG: Record<string, { bg: string; text: string; border: string; glow: string; dot: string; hex: string }> = {
  'Blue': { bg: 'bg-sky-500/10', text: 'text-sky-300', border: 'border-sky-500/30', glow: 'hover:shadow-[0_0_20px_rgba(56,189,248,12%)]', dot: 'bg-sky-500', hex: '#38BDF8' },
  'Teal': { bg: 'bg-teal-500/10', text: 'text-teal-300', border: 'border-teal-500/30', glow: 'hover:shadow-[0_0_20px_rgba(45,212,191,12%)]', dot: 'bg-teal-500', hex: '#2DD4BF' },
  'Purple': { bg: 'bg-violet-500/10', text: 'text-violet-300', border: 'border-violet-500/30', glow: 'hover:shadow-[0_0_20px_rgba(167,139,250,12%)]', dot: 'bg-violet-500', hex: '#A78BFA' },
  'Green': { bg: 'bg-emerald-500/10', text: 'text-emerald-300', border: 'border-emerald-500/30', glow: 'hover:shadow-[0_0_20px_rgba(52,211,153,12%)]', dot: 'bg-emerald-500', hex: '#34D399' },
  'Amber': { bg: 'bg-amber-500/10', text: 'text-amber-300', border: 'border-amber-500/30', glow: 'hover:shadow-[0_0_20px_rgba(251,191,36,12%)]', dot: 'bg-amber-500', hex: '#FBBF24' },
};

const SUBJECT_BAR_COLORS: Record<string, string> = {
  'Blue': 'bg-sky-500/70',
  'Teal': 'bg-teal-500/70',
  'Purple': 'bg-violet-500/70',
  'Green': 'bg-emerald-500/70',
  'Amber': 'bg-amber-500/70',
};

function CircularProgress({ percentage, size = 36 }: { percentage: number; size?: number }) {
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-secondary"
      />
      {/* Progress arc */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="oklch(0.795 0.184 86.047)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </svg>
  );
}

function MissionCard({ task, onToggle }: { task: TodayTask; onToggle: (id: string) => void }) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [swipeX, setSwipeX] = useState(0);
  const touchStartX = useRef(0);
  const priority = PRIORITY_STYLES[task.priority] || PRIORITY_STYLES.low;
  const colorTag = COLOR_TAG[task.subjectColor] || COLOR_TAG['Amber'];

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - touchStartX.current;
    setSwipeX(diff * 0.3);
  };

  const handleTouchEnd = () => {
    if (swipeX > 60) {
      onToggle(task.topicId);
    } else if (swipeX < -60) {
      // Swipe left = postpone
    }
    setSwipeX(0);
  };

  const handleCheckClick = () => {
    setIsAnimating(true);
    onToggle(task.topicId);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{
        opacity: task.completed ? 0.4 : 1,
        x: swipeX,
        scale: 1,
        y: 0,
      }}
      exit={{ opacity: 0, x: 80, scale: 0.95, transition: { duration: 0.3, ease: 'easeIn' } }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`glass rounded-xl p-4 transition-all duration-300 border-l-[3px] ${colorTag.border} ${colorTag.glow} ${
        task.completed ? 'border-l-muted-foreground/20' : ''
      }`}
    >
      {/* Colored dot on the left border area */}
      <div className="flex items-start gap-3">
        {/* Circular checkbox */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleCheckClick}
          className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 mt-0.5 ${
            task.completed
              ? `${colorTag.bg} border-0`
              : 'border-2 border-muted-foreground/30 hover:border-primary'
          } ${isAnimating ? 'haptic-click' : ''}`}
        >
          {task.completed && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              <Check className="w-3 h-3 text-primary" />
            </motion.div>
          )}
        </motion.button>

        {/* Task content */}
        <div className="flex-1 min-w-0">
          {/* Priority indicator */}
          <div className="flex items-center gap-1.5 mb-1">
            <span className={`w-1.5 h-1.5 rounded-full ${task.completed ? 'bg-muted-foreground/30' : priority.dot} ${!task.completed && task.priority === 'high' ? 'priority-pulse' : ''}`} />
            <span className={`text-[9px] font-mono tracking-wider ${task.completed ? 'text-muted-foreground/40' : priority.text}`}>{priority.label}</span>
          </div>

          {/* Topic icon + title */}
          <div className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${task.completed ? 'bg-secondary/50' : 'bg-secondary'}`}>
              <FileText className="w-2.5 h-2.5 text-muted-foreground" />
            </div>
            <p className={`text-sm font-medium truncate transition-all duration-300 ${task.completed ? 'line-through text-muted-foreground/50' : ''}`}>
              {task.topicName}
            </p>
          </div>

          {/* Course details */}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${task.completed ? 'bg-secondary/30 text-muted-foreground/40' : `${colorTag.bg} ${colorTag.text}`}`}>
              {task.subjectIcon} {task.subjectName} · Lecture
            </span>
            <span className={`text-[10px] font-mono ${task.completed ? 'text-muted-foreground/30' : 'text-muted-foreground'}`}>
              {task.chapterName}
            </span>
          </div>
        </div>

        {/* Duration + actions */}
        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
            <Clock className="w-3 h-3" />
            <span>{task.duration}m</span>
          </div>

          {/* Action links */}
          {task.videoLink && (
            <a
              href={task.videoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
            >
              <Play className="w-3 h-3" />
            </a>
          )}
          {task.pdfLink && (
            <a
              href={task.pdfLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-6 h-6 rounded-lg bg-secondary flex items-center justify-center text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              <FileText className="w-3 h-3" />
            </a>
          )}

          <button className="w-6 h-6 rounded-lg hover:bg-secondary/50 flex items-center justify-center text-muted-foreground transition-colors">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState({ filter }: { filter: 'all' | 'pending' | 'done' }) {
  const message = filter === 'done'
    ? 'No completed missions yet'
    : filter === 'pending'
      ? 'All missions cleared!'
      : 'No missions for today';
  const subtext = filter === 'done'
    ? 'Complete a task and it will show up here'
    : filter === 'pending'
      ? 'Great work — take a well-earned break'
      : 'Your tasks will appear here when assigned';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="text-center py-10"
    >
      <div className="w-12 h-12 rounded-2xl bg-secondary/50 flex items-center justify-center mx-auto mb-3">
        <Sparkles className="w-5 h-5 text-primary/50" />
      </div>
      <p className="text-sm font-display font-semibold text-foreground/60 mb-1">{message}</p>
      <p className="text-[11px] font-mono text-muted-foreground/60">{subtext}</p>
    </motion.div>
  );
}

function SubjectDistributionBar({ subjectGroups }: {
  subjectGroups: Record<string, { color: string; icon: string; total: number; completed: number }>;
}) {
  const entries = Object.entries(subjectGroups);
  if (entries.length === 0) return null;

  const totalTasks = entries.reduce((sum, [, info]) => sum + info.total, 0);

  return (
    <div className="space-y-1.5">
      {/* Stacked bar */}
      <div className="flex h-2 rounded-full overflow-hidden bg-secondary/50 gap-[1px]">
        {entries.map(([name, info]) => {
          const width = totalTasks > 0 ? (info.total / totalTasks) * 100 : 0;
          const barColor = SUBJECT_BAR_COLORS[info.color] || 'bg-amber-500/70';
          return (
            <motion.div
              key={name}
              initial={{ width: 0 }}
              animate={{ width: `${width}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className={`h-full rounded-full first:rounded-l-full last:rounded-r-full ${barColor} relative group`}
              title={`${name}: ${info.completed}/${info.total}`}
            >
              {/* Completed portion overlay */}
              {info.completed > 0 && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(info.completed / info.total) * 100}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut', delay: 0.3 }}
                  className="absolute inset-y-0 left-0 bg-white/25 rounded-l-full"
                />
              )}
            </motion.div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {entries.map(([name, info]) => {
          const colorTag = COLOR_TAG[info.color] || COLOR_TAG['Amber'];
          return (
            <div key={name} className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 rounded-full ${colorTag.dot}`} />
              <span className="text-[9px] font-mono text-muted-foreground">
                {info.icon} {name} <span className="text-muted-foreground/60">{info.completed}/{info.total}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MissionFeed() {
  const { todayTasks, toggleTaskComplete } = useStudyOS();
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');

  const filteredTasks = todayTasks.filter(task => {
    if (filter === 'pending') return !task.completed;
    if (filter === 'done') return task.completed;
    return true;
  });

  const completedCount = todayTasks.filter(t => t.completed).length;
  const totalCount = todayTasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Group tasks by subject for a quick overview
  const subjectGroups = todayTasks.reduce((acc, task) => {
    if (!acc[task.subjectName]) {
      acc[task.subjectName] = { color: task.subjectColor, icon: task.subjectIcon, total: 0, completed: 0 };
    }
    acc[task.subjectName].total++;
    if (task.completed) acc[task.subjectName].completed++;
    return acc;
  }, {} as Record<string, { color: string; icon: string; total: number; completed: number }>);

  return (
    <div>
      {/* Header with progress ring */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <CircularProgress percentage={progressPct} size={40} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[9px] font-display font-bold text-primary">{progressPct}</span>
            </div>
          </div>
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight">Today&apos;s mission</h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              Swipe right to complete · left to postpone
            </p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-semibold text-primary hover:bg-primary/10 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add mission
        </motion.button>
      </div>

      {/* Subject distribution bar */}
      {Object.keys(subjectGroups).length > 0 && (
        <div className="mb-4">
          <SubjectDistributionBar subjectGroups={subjectGroups} />
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-muted-foreground font-mono tracking-wider flex items-center gap-1.5">
            <Target className="w-3 h-3" />
            {completedCount}/{totalCount} MISSIONS COMPLETE
          </span>
          <span className="text-xs font-display font-bold text-primary">{progressPct}%</span>
        </div>
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-secondary rounded-lg p-0.5 w-fit">
        {(['all', 'pending', 'done'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-mono transition-all duration-200 ${
              filter === f
                ? 'bg-background shadow-sm text-foreground font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Mission cards */}
      <div className="space-y-2.5 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
        <AnimatePresence mode="popLayout">
          {filteredTasks.map((task) => (
            <MissionCard
              key={task.topicId}
              task={task}
              onToggle={toggleTaskComplete}
            />
          ))}
        </AnimatePresence>

        {filteredTasks.length === 0 && (
          <EmptyState filter={filter} />
        )}
      </div>
    </div>
  );
}
