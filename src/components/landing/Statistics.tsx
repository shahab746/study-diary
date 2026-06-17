'use client';

import { motion, useInView } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

const stats = [
  { value: 95, suffix: '%', label: 'Student Consistency', desc: 'stick to their plan with Study Diary' },
  { value: 4, suffix: 'x', label: 'Better Organization', desc: 'compared to self-study methods' },
  { value: 100, suffix: '%', label: 'FBISE Focused', desc: 'aligned with Federal Board syllabus' },
  { value: 24, suffix: '/7', label: 'Available Anywhere', desc: 'on any device, any time' },
];

function AnimatedCounter({ target, suffix, inView }: { target: number; suffix: string; inView: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 2000;
    const startTime = Date.now();

    const timer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(eased * target);
      setCount(start);
      if (progress >= 1) clearInterval(timer);
    }, 16);

    return () => clearInterval(timer);
  }, [target, inView]);

  return (
    <span className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 dark:text-white">
      {count}
      <span className="bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent">{suffix}</span>
    </span>
  );
}

export default function Statistics() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-24 sm:py-32 bg-white dark:bg-gray-950" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="text-center"
            >
              <AnimatedCounter target={stat.value} suffix={stat.suffix} inView={inView} />
              <p className="mt-2 text-base font-semibold text-gray-900 dark:text-white">{stat.label}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{stat.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
