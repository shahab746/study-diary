'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useStudyOS } from '@/lib/store';
import { useEffect, useState, useRef } from 'react';

const GOAL_LABELS: Record<string, string> = {
  '3M': '3M',
  '5M': '5M',
  '6M': '6M',
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
        const eased = 1 - Math.pow(1 - progress, 3);
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
  const monthsMap: Record<string, number> = { '3M': 3, '5M': 5, '6M': 6 };
  const months = monthsMap[activePacingGoal] || 5;
  const currentDay = student?.currentDay || 1;
  const daysLeft = Math.max(1, (months * 30) - currentDay);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`glass-strong rounded-xl p-4 top-glow ${isPulsing ? 'pulse-subtle' : ''}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-sm font-bold tracking-tight">Pacing Engine</h2>
        {syncing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-[10px] text-primary font-mono"
          >
            Syncing...
          </motion.div>
        )}
      </div>

      {/* Goal Toggle Buttons */}
      <div className="flex gap-1.5 mb-4">
        {Object.entries(GOAL_LABELS).map(([key, label]) => (
          <motion.button
            key={key}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleGoalChange(key)}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-display font-semibold transition-all duration-200 ${
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
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={animatedNumber}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-2xl font-display font-bold text-primary"
            >
              {animatedNumber}
            </motion.div>
          </AnimatePresence>
          <p className="text-[9px] text-muted-foreground font-mono mt-0.5">TOPICS/DAY</p>
        </div>

        <div className="text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={activePacingGoal}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-2xl font-display font-bold"
            >
              {currentPacing?.months || 5}
            </motion.div>
          </AnimatePresence>
          <p className="text-[9px] text-muted-foreground font-mono mt-0.5">MONTHS</p>
        </div>

        <div className="text-center">
          <div className="text-2xl font-display font-bold">{daysLeft}</div>
          <p className="text-[9px] text-muted-foreground font-mono mt-0.5">DAYS LEFT</p>
        </div>
      </div>

      {/* Target Date */}
      <div className="mt-3 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-muted-foreground font-mono">TARGET DATE</span>
          <AnimatePresence mode="wait">
            <motion.span
              key={currentPacing?.targetDate || activePacingGoal}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="text-xs font-display font-semibold text-primary"
            >
              {currentPacing?.targetDate || '—'}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
