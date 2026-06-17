'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Ayesha Khan',
    class: '10th FBISE',
    quote: 'Study Diary gave me a clear plan. I went from confused about what to study to completing my entire Physics syllabus in just 2 months.',
    stars: 5,
  },
  {
    name: 'Hamza Ali',
    class: 'FSc Pre-Medical',
    quote: 'The daily tasks feature is a game-changer. I open the app, and it tells me exactly what to study. No more wasting time deciding.',
    stars: 5,
  },
  {
    name: 'Fatima Noor',
    class: '9th FBISE',
    quote: 'My streak motivates me to study every day. I\'ve maintained a 21-day streak and covered more syllabus than ever before.',
    stars: 5,
  },
  {
    name: 'Ahmed Raza',
    class: '11th FBISE',
    quote: 'Finally, an app made for Federal Board students. The video lectures and notes are exactly what I needed for Chemistry.',
    stars: 5,
  },
  {
    name: 'Sana Zahid',
    class: '10th FBISE',
    quote: 'I used to spend hours searching for the right YouTube videos. Study Diary has them all organized by topic. Huge time saver!',
    stars: 5,
  },
  {
    name: 'Bilal Iftikhar',
    class: '12th FBISE',
    quote: 'The progress tracking is amazing. I can see exactly how much of each subject I\'ve completed. No more guessing.',
    stars: 5,
  },
];

export default function Testimonials() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section className="py-24 sm:py-32 bg-gray-50 dark:bg-gray-900" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-sm font-semibold text-red-500 uppercase tracking-widest">Testimonials</span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Loved by students across Pakistan
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="p-6 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-red-200 dark:hover:border-red-500/30 transition-all duration-300 hover:shadow-lg hover:shadow-red-500/5"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.stars }).map((_, si) => (
                  <Star key={si} width={16} height={16} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-5">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center text-white font-bold text-sm">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{t.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.class}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
