'use client';

import { motion } from 'framer-motion';
import { useStudyOS } from '@/lib/store';

export function CalendarStrip() {
  const { student } = useStudyOS();
  
  // Generate last 7 days
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
      date: date.getDate(),
      isToday: i === 6,
      isPast: i < 6,
    };
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="glass rounded-xl p-4"
    >
      <h3 className="text-xs font-mono text-muted-foreground tracking-wider mb-3">LAST 7 DAYS</h3>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((day, i) => (
          <div
            key={i}
            className={`flex flex-col items-center gap-1 py-2 rounded-lg transition-colors ${
              day.isToday
                ? 'bg-primary/15 border border-primary/30'
                : 'hover:bg-secondary/50'
            }`}
          >
            <span className="text-[9px] font-mono text-muted-foreground">{day.day}</span>
            <span className={`text-sm font-display font-bold ${
              day.isToday ? 'text-primary' : ''
            }`}>{day.date}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
