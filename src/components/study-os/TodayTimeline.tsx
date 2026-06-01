'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useStudyOS, TodayTask } from '@/lib/store';
import { useState, useRef } from 'react';
import { Check, ChevronRight, ExternalLink, Clock } from 'lucide-react';

const COLOR_STYLES: Record<string, string> = {
  'Blue': 'border-l-blue-500',
  'Teal': 'border-l-teal-500',
  'Purple': 'border-l-purple-500',
  'Green': 'border-l-green-500',
  'Amber': 'border-l-amber-500',
};

function MissionNode({ task, onToggle }: { task: TodayTask; onToggle: (id: string) => void }) {
  const [swipeX, setSwipeX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartX = useRef(0);
  const borderStyle = COLOR_STYLES[task.subjectColor] || 'border-l-primary';

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = e.touches[0].clientX - touchStartX.current;
    setSwipeX(diff * 0.3);
  };

  const handleTouchEnd = () => {
    if (swipeX > 60) {
      // Swipe right = complete
      onToggle(task.topicId);
    } else if (swipeX < -60) {
      // Swipe left = postpone (just reset for now)
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
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: swipeX }}
      exit={{ opacity: 0, x: 100 }}
      transition={{ duration: 0.25 }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`glass rounded-xl p-3 border-l-3 ${borderStyle} relative
        ${task.completed ? 'opacity-60' : ''}
        transition-opacity duration-300`}
    >
      <div className="flex items-center gap-3">
        {/* Check button */}
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleCheckClick}
          className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 ${
            task.completed
              ? 'bg-primary text-primary-foreground'
              : 'border-2 border-muted-foreground/30 hover:border-primary'
          } ${isAnimating ? 'haptic-click' : ''}`}
        >
          {task.completed && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 20 }}
            >
              <Check className="w-3.5 h-3.5" />
            </motion.div>
          )}
        </motion.button>

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium truncate ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
            {task.topicName}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs font-mono text-muted-foreground">{task.subjectName}</span>
            <ChevronRight className="w-3 h-3 text-muted-foreground/40" />
            <span className="text-xs font-mono text-muted-foreground/70 truncate">{task.chapterName}</span>
          </div>
        </div>

        {/* Day badge + links */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
            <Clock className="w-3 h-3" />
            <span>Day {task.dayNumber}</span>
          </div>
          {task.videoLink && (
            <a
              href={task.videoLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-primary transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function TodayTimeline() {
  const { todayTasks, toggleTaskComplete, student } = useStudyOS();
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');

  const filteredTasks = todayTasks.filter(task => {
    if (filter === 'pending') return !task.completed;
    if (filter === 'done') return task.completed;
    return true;
  });

  const completedCount = todayTasks.filter(t => t.completed).length;
  const totalCount = todayTasks.length;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="font-display text-lg font-bold tracking-tight">Today&apos;s Mission Feed</h2>
          <span className="text-xs text-muted-foreground font-mono px-2 py-0.5 bg-secondary rounded-md">
            DAY {student?.currentDay || 1}
          </span>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
          {(['all', 'pending', 'done'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2.5 py-1 rounded-md text-xs font-mono transition-all duration-200 ${
                filter === f
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground font-mono">
            {completedCount}/{totalCount} MISSIONS COMPLETE
          </span>
          <span className="text-xs font-display font-bold text-primary">{progressPct}%</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Mission nodes */}
      <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-1">
        <AnimatePresence mode="popLayout">
          {filteredTasks.map((task) => (
            <MissionNode
              key={task.topicId}
              task={task}
              onToggle={toggleTaskComplete}
            />
          ))}
        </AnimatePresence>

        {filteredTasks.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm font-mono">
              {filter === 'done' ? 'No completed missions yet' : 'All missions cleared! 🎉'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
