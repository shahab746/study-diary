'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Shield, Flag, Calendar, Award } from 'lucide-react';

const badges = [
  { icon: <Flag width={18} height={18} />, label: 'Federal Board Focused' },
  { icon: <Shield width={18} height={18} />, label: 'Built for Pakistani Students' },
  { icon: <Calendar width={18} height={18} />, label: 'Daily Study Planning' },
  { icon: <Award width={18} height={18} />, label: 'Premium Notes & Videos' },
];

export default function Trust() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-12 sm:py-16 bg-white dark:bg-gray-950 border-y border-gray-100 dark:border-gray-800" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap justify-center gap-x-8 gap-y-4">
          {badges.map((badge, i) => (
            <motion.div
              key={badge.label}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className="flex items-center gap-2.5 px-4 py-2 rounded-full bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
            >
              <span className="text-red-500">{badge.icon}</span>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{badge.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
