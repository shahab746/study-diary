'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { GraduationCap, ListChecks, TrendingUp } from 'lucide-react';

const steps = [
  {
    icon: <GraduationCap width={28} height={28} />,
    step: '01',
    title: 'Choose Your Class',
    desc: 'Select your grade (9th–12th) and field. Study Diary instantly loads the complete FBISE syllabus tailored for you.',
    color: 'from-blue-500 to-cyan-500',
    bg: 'bg-blue-50 dark:bg-blue-500/10',
  },
  {
    icon: <ListChecks width={28} height={28} />,
    step: '02',
    title: 'Get Daily Topics',
    desc: 'Each day, you get a focused list of topics with video lectures and PDF notes. No guesswork — just follow the plan.',
    color: 'from-red-500 to-rose-500',
    bg: 'bg-red-50 dark:bg-red-500/10',
  },
  {
    icon: <TrendingUp width={28} height={28} />,
    step: '03',
    title: 'Track Progress',
    desc: 'Check off completed topics, watch your streak grow, and see exactly how much of the syllabus you\'ve conquered.',
    color: 'from-emerald-500 to-green-500',
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="how-it-works" className="py-24 sm:py-32 bg-gray-50 dark:bg-gray-900" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-sm font-semibold text-red-500 uppercase tracking-widest">How It Works</span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Three steps to a{' '}
            <span className="bg-gradient-to-r from-red-500 to-amber-500 bg-clip-text text-transparent">
              smarter study habit
            </span>
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, i) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="relative text-center"
            >
              {/* Connector line (desktop) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-14 left-[60%] w-[80%] h-px border-t-2 border-dashed border-gray-200 dark:border-gray-700" />
              )}
              
              <div className={`w-20 h-20 mx-auto rounded-2xl ${step.bg} flex items-center justify-center text-gray-900 dark:text-white mb-6 relative`}>
                {step.icon}
                <span className={`absolute -top-2 -right-2 w-7 h-7 rounded-lg bg-gradient-to-r ${step.color} text-white text-xs font-bold flex items-center justify-center shadow-lg`}>
                  {step.step}
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{step.title}</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-sm mx-auto">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
