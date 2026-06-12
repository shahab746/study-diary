'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Frown, Search, Clock, Brain } from 'lucide-react';

const problems = [
  {
    icon: <Frown width={24} height={24} />,
    title: 'No clear study plan',
    desc: 'Students don\'t know what to study next or how to pace their preparation across months.',
  },
  {
    icon: <Search width={24} height={24} />,
    title: 'Don\'t know syllabus progress',
    desc: 'No visibility into how much of the syllabus is covered and what remains.',
  },
  {
    icon: <Clock width={24} height={24} />,
    title: 'Waste hours searching YouTube',
    desc: 'Endlessly scrolling for the right video instead of actually studying.',
  },
  {
    icon: <Brain width={24} height={24} />,
    title: 'Forget important topics',
    desc: 'No revision system means students lose track of what they\'ve already learned.',
  },
];

const cardVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.15, duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function Problem() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-24 sm:py-32 bg-white dark:bg-gray-950" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Most Students Study Hard.{' '}
            <span className="bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent">
              Few Study Smart.
            </span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Without a system, even the hardest-working students fall behind.
          </p>
        </motion.div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((problem, i) => (
            <motion.div
              key={problem.title}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate={inView ? 'visible' : 'hidden'}
              className="group relative p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-red-200 dark:hover:border-red-500/30 hover:bg-red-50/50 dark:hover:bg-red-500/5 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/5"
            >
              <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-500 mb-4 group-hover:scale-110 transition-transform">
                {problem.icon}
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {problem.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                {problem.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
