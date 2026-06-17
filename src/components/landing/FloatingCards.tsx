'use client';

import { motion } from 'framer-motion';
import { Check, Video, FileText, BarChart3, Clock, Zap } from 'lucide-react';

const cards = [
  { icon: <Check width={14} height={14} />, label: 'Daily Topics', x: '-60px', y: '80px', delay: 0 },
  { icon: <Video width={14} height={14} />, label: 'Video Lectures', x: '-80px', y: '200px', delay: 0.2 },
  { icon: <FileText width={14} height={14} />, label: 'PDF Notes', x: '-50px', y: '340px', delay: 0.4 },
  { icon: <BarChart3 width={14} height={14} />, label: 'Progress Tracking', x: 'calc(100% + 10px)', y: '80px', delay: 0.1 },
  { icon: <Clock width={14} height={14} />, label: 'Exam Countdown', x: 'calc(100% + 20px)', y: '220px', delay: 0.3 },
  { icon: <Zap width={14} height={14} />, label: 'Smart Planning', x: 'calc(100% + 5px)', y: '360px', delay: 0.5 },
];

export default function FloatingCards() {
  return (
    <>
      {cards.map((card) => (
        <motion.div
          key={card.label}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 + card.delay, duration: 0.5 }}
          className="absolute hidden lg:flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-gray-800 rounded-xl shadow-xl shadow-black/10 border border-gray-100 dark:border-gray-700 z-20"
          style={{ left: card.x, top: card.y }}
        >
          <motion.div
            animate={{ y: [0, -4, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut', delay: card.delay }}
            className="flex items-center gap-2.5"
          >
            <div className="w-7 h-7 rounded-lg bg-red-50 dark:bg-red-500/10 flex items-center justify-center text-red-500">
              {card.icon}
            </div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
              {card.label}
            </span>
          </motion.div>
        </motion.div>
      ))}
    </>
  );
}
