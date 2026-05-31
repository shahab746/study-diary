'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useStudyOS } from '@/lib/store';
import { useEffect, useState, useRef } from 'react';

const GOAL_LABELS: Record<string, string> = {
  '3M': '3 Months',
  '5M': '5 Months',
  '6M': '6 Months',
};

export function PacingEngineCard() {
  const { pacingGoals, activePacingGoal, setPacingGoal, topicsPerDay, student, syncing } = useStudyOS();
  const [animatedNumber, setAnimatedNumber] = useState(topicsPerDay);
  const [isPulsing, setIsPulsing] = useState(false);
  const prevNumber = useRef(topicsPerDay);

  useEffect(() => {
    if (prevNumber.current !== topicsPerDay) {
      const start = prevNumber.current;
      const end = topicsPerDay;
      const duration = 500;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = Math.round(start + (end - start) * eased);
        setAnimatedNumber(current);

        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };

      requestAnimationFrame(animate);
      prevNumber.current = topicsPerDay;
    }
  }, [topicsPerDay]);

  const handleGoalChange = (goal: string) => {
    setIsPulsing(true);
    setPacingGoal(goal);
    setTimeout(() => setIsPulsing(false), 600);
  };

  const currentPacing = pacingGoals[activePacingGoal];
  const daysLeft = student?.daysLeft || 423;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`glass-strong rounded-2xl p-6 top-glow ${isPulsing ? 'pulse-subtle' : ''}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="font-display text-lg font-bold tracking-tight">Pacing Engine</h2>
          <p className="text-xs text-muted-foreground font-mono mt-0.5">SET YOUR TIMELINE GOAL</p>
        </div>
        <div className="flex items-center gap-1.5">
          {syncing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-xs text-amber-500 font-mono"
            >
              Syncing...
            </motion.div>
          )}
        </div>
      </div>

      {/* Goal Toggle Buttons */}
      <div className="flex gap-2 mb-6">
        {Object.entries(GOAL_LABELS).map(([key, label]) => (
          <motion.button
            key={key}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleGoalChange(key)}
            className={`px-4 py-2 rounded-xl text-sm font-display font-semibold transition-all duration-200 ${
              activePacingGoal === key
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {label}
          </motion.button>
        ))}
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={animatedNumber}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-3xl font-display font-bold text-primary"
            >
              {animatedNumber}
            </motion.div>
          </AnimatePresence>
          <p className="text-xs text-muted-foreground font-mono mt-1">TOPICS/DAY</p>
        </div>

        <div className="text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePacingGoal}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-3xl font-display font-bold"
            >
              {currentPacing?.months || 5}
            </motion.div>
          </AnimatePresence>
          <p className="text-xs text-muted-foreground font-mono mt-1">MONTHS</p>
        </div>

        <div className="text-center">
          <div className="text-3xl font-display font-bold">{daysLeft}</div>
          <p className="text-xs text-muted-foreground font-mono mt-1">DAYS LEFT</p>
        </div>
      </div>

      {/* Target Date */}
      <div className="mt-4 pt-4 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-mono">TARGET DATE</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={currentPacing?.targetDate || activePacingGoal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-sm font-display font-semibold text-primary"
            >
              {currentPacing?.targetDate || '—'}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
