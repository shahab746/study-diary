'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useStudyOS, TodayTask } from '@/lib/store';
import { useState, useRef } from 'react';
import { Check, Clock, MoreHorizontal, Play, FileText, Plus } from 'lucide-react';

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

const COLOR_TAG: Record<string, { bg: string; text: string; border: string }> = {
  'Blue': { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
  'Teal': { bg: 'bg-teal-500/15', text: 'text-teal-400', border: 'border-teal-500/30' },
  'Purple': { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  'Green': { bg: 'bg-green-500/15', text: 'text-green-400', border: 'border-green-500/30' },
  'Amber': { bg: 'bg-amber-500/15', text: 'text-amber-400', border: 'border-amber-500/30' },
};

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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, x: swipeX }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.25 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`glass rounded-xl p-4 transition-all duration-300 border-l-2 ${
        task.completed ? 'opacity-50' : ''
      } ${colorTag.border}`}
    >
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
            <span className={`w-1.5 h-1.5 rounded-full ${priority.dot} ${task.priority === 'high' ? 'priority-pulse' : ''}`} />
            <span className={`text-[9px] font-mono tracking-wider ${priority.text}`}>{priority.label}</span>
          </div>
          
          {/* Topic icon + title */}
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-secondary flex items-center justify-center flex-shrink-0">
              <FileText className="w-2.5 h-2.5 text-muted-foreground" />
            </div>
            <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
              {task.topicName}
            </p>
          </div>

          {/* Course details */}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${colorTag.bg} ${colorTag.text}`}>
              {task.subjectIcon} {task.subjectName} · Lecture
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
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

export function MissionFeed() {
  const { todayTasks, toggleTaskComplete, focusScore } = useStudyOS();
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
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-display text-xl font-bold tracking-tight">Today&apos;s mission</h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">
            Swipe right to complete · left to postpone
          </p>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-semibold text-primary hover:bg-primary/10 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add mission
        </motion.button>
      </div>

      {/* Subject distribution pills */}
      {Object.keys(subjectGroups).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {Object.entries(subjectGroups).map(([name, info]) => {
            const colorTag = COLOR_TAG[info.color] || COLOR_TAG['Amber'];
            return (
              <div
                key={name}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono ${colorTag.bg} ${colorTag.text}`}
              >
                <span>{info.icon}</span>
                <span>{name}</span>
                <span className="opacity-60">{info.completed}/{info.total}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-muted-foreground font-mono tracking-wider">
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
      <div className="space-y-2 max-h-[500px] overflow-y-auto custom-scrollbar pr-1">
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
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm font-mono">
              {filter === 'done' ? 'No completed missions yet' : 'All missions cleared!'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
