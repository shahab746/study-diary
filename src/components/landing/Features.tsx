'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import {
  Calendar, BarChart3, Video, FileText, Target, Clock, Flame, Smartphone
} from 'lucide-react';

const features = [
  {
    icon: <Calendar width={22} height={22} />,
    title: 'Daily Study Planner',
    desc: 'Automatically generates a focused daily plan based on your pacing goal and syllabus progress.',
  },
  {
    icon: <BarChart3 width={22} height={22} />,
    title: 'Progress Dashboard',
    desc: 'Visual tracking of every subject, chapter, and topic — see exactly where you stand.',
  },
  {
    icon: <Video width={22} height={22} />,
    title: 'Video Lectures',
    desc: 'Curated YouTube lectures for every topic — no more endless searching.',
  },
  {
    icon: <FileText width={22} height={22} />,
    title: 'PDF Notes',
    desc: 'Downloadable notes and past papers aligned with each topic in the syllabus.',
  },
  {
    icon: <Target width={22} height={22} />,
    title: 'Goal-Based Planning',
    desc: 'Choose 3, 5, or 6 month plans — Study Diary adjusts your daily workload automatically.',
  },
  {
    icon: <Clock width={22} height={22} />,
    title: 'Exam Countdown',
    desc: 'Real-time countdown to board exams so you always know how much time is left.',
  },
  {
    icon: <Flame width={22} height={22} />,
    title: 'Motivation Streaks',
    desc: 'Build daily study streaks and maintain consistency with smart reminders.',
  },
  {
    icon: <Smartphone width={22} height={22} />,
    title: 'Works On Any Device',
    desc: 'Mobile-first design that works beautifully on phones, tablets, and desktops.',
  },
];

export default function Features() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="features" className="py-24 sm:py-32 bg-white dark:bg-gray-950" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-sm font-semibold text-red-500 uppercase tracking-widest">Features</span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Everything you need to{' '}
            <span className="bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent">
              ace your boards
            </span>
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Built from the ground up for Federal Board students — no fluff, no distractions.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="group p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 hover:border-red-200 dark:hover:border-red-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-red-500/5 hover:-translate-y-1"
            >
              <div className="w-11 h-11 rounded-xl bg-red-100 dark:bg-red-500/10 flex items-center justify-center text-red-500 mb-4 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
