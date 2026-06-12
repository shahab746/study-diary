'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Check, Flame, Play, Clock, BookOpen, FileText } from 'lucide-react';

export default function DashboardPreview() {
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
          <span className="text-sm font-semibold text-red-500 uppercase tracking-widest">Dashboard</span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Your study command center
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Everything at a glance — progress, tasks, subjects, and streaks.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative rounded-3xl bg-[#0A0A0A] border border-gray-800 shadow-2xl shadow-black/40 overflow-hidden"
        >
          {/* Top bar */}
          <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-800">
            <div className="flex gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 text-center">
              <span className="text-xs text-gray-600 font-medium">study-diary.app</span>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="grid md:grid-cols-3 gap-6">
              {/* Left column — Stats */}
              <div className="space-y-4">
                <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">Focus Score</p>
                  <p className="text-3xl font-extrabold text-white">87<span className="text-lg text-gray-500">%</span></p>
                  <div className="mt-3 w-full h-2 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-500" style={{ width: '87%' }} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                    <Flame width={20} height={20} className="text-amber-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-white">18</p>
                    <p className="text-[10px] text-gray-500">Day Streak</p>
                  </div>
                  <div className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                    <Clock width={20} height={20} className="text-red-500 mx-auto mb-1" />
                    <p className="text-xl font-bold text-white">42</p>
                    <p className="text-[10px] text-gray-500">Days Left</p>
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-xs text-gray-500 mb-3">Subject Progress</p>
                  {[
                    { name: 'Physics', pct: 78, color: '#3B82F6' },
                    { name: 'Chemistry', pct: 52, color: '#14B8A6' },
                    { name: 'Maths', pct: 65, color: '#F59E0B' },
                    { name: 'Biology', pct: 44, color: '#22C55E' },
                    { name: 'English', pct: 89, color: '#F43F5E' },
                  ].map((s) => (
                    <div key={s.name} className="flex items-center gap-3 mb-2 last:mb-0">
                      <span className="text-xs text-gray-400 w-20 truncate">{s.name}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{s.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Center — Today's Tasks */}
              <div className="space-y-3">
                <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-white">Today&apos;s Mission</p>
                    <span className="text-xs text-gray-500">4 of 7 done</span>
                  </div>
                  {[
                    { name: 'Ohm\'s Law & Resistance', subject: 'Physics', done: true },
                    { name: 'Chemical Bonding', subject: 'Chemistry', done: true },
                    { name: 'Quadratic Equations', subject: 'Maths', done: false },
                    { name: 'Cell Division', subject: 'Biology', done: false },
                    { name: 'Active & Passive Voice', subject: 'English', done: false },
                  ].map((t) => (
                    <div key={t.name} className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0">
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${t.done ? 'bg-green-500 border-green-500' : 'border-gray-600'}`}>
                        {t.done && <Check width={12} height={12} className="text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium truncate ${t.done ? 'text-gray-500 line-through' : 'text-white'}`}>{t.name}</p>
                        <p className="text-[10px] text-gray-600">{t.subject}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Upcoming */}
                <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                  <p className="text-sm font-semibold text-white mb-3">Upcoming</p>
                  {[
                    { name: 'Electromagnetic Induction', day: 'Tomorrow' },
                    { name: 'Organic Chemistry Intro', day: 'Wed' },
                  ].map((t) => (
                    <div key={t.name} className="flex items-center gap-3 py-2">
                      <BookOpen width={14} height={14} className="text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white truncate">{t.name}</p>
                      </div>
                      <span className="text-[10px] text-gray-500">{t.day}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right column */}
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-red-500/10 to-amber-500/10 rounded-2xl p-5 border border-red-500/10">
                  <div className="flex items-center gap-2 mb-3">
                    <Flame width={16} height={16} className="text-amber-500" />
                    <p className="text-sm font-semibold text-white">18 Day Streak!</p>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">You&apos;re on fire! Keep going to maintain your streak.</p>
                  <div className="flex gap-1">
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} className={`flex-1 h-2 rounded-full ${i < 5 ? 'bg-amber-500' : 'bg-white/10'}`} />
                    ))}
                  </div>
                </div>

                <div className="bg-white/5 rounded-2xl p-5 border border-white/5">
                  <p className="text-sm font-semibold text-white mb-3">Quick Actions</p>
                  {[
                    { icon: <Play width={14} height={14} />, label: 'Watch next lecture', color: 'text-red-500' },
                    { icon: <FileText width={14} height={14} />, label: 'Download notes', color: 'text-amber-500' },
                    { icon: <Clock width={14} height={14} />, label: 'Start focus timer', color: 'text-green-500' },
                  ].map((a) => (
                    <button key={a.label} className="flex items-center gap-3 w-full py-2.5 text-left hover:bg-white/5 rounded-lg px-2 -mx-2 transition-colors">
                      <span className={a.color}>{a.icon}</span>
                      <span className="text-xs text-gray-300">{a.label}</span>
                    </button>
                  ))}
                </div>

                <div className="bg-white/5 rounded-2xl p-5 border border-white/5 text-center">
                  <p className="text-3xl font-extrabold text-white">73%</p>
                  <p className="text-xs text-gray-500 mt-1">Syllabus Completed</p>
                  <div className="mt-3 w-full h-2 rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-gradient-to-r from-red-500 to-amber-500" style={{ width: '73%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
