'use client';

import { motion } from 'framer-motion';
import { Check, Flame, BookOpen, Play, Clock } from 'lucide-react';
import FloatingCards from './FloatingCards';

const float = {
  animate: {
    y: [0, -8, 0],
    transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' },
  },
};

export default function AnimatedPhone() {
  return (
    <div className="relative w-[300px] sm:w-[340px]">
      {/* Floating cards around the phone */}
      <FloatingCards />

      {/* Phone frame */}
      <motion.div {...float} className="relative z-10">
        <div className="rounded-[3rem] bg-gray-900 dark:bg-gray-800 p-3 shadow-2xl shadow-black/40 ring-1 ring-white/10">
          {/* Notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-7 bg-gray-900 dark:bg-gray-800 rounded-b-2xl z-20" />
          
          {/* Screen */}
          <div className="rounded-[2.4rem] overflow-hidden bg-[#0A0A0A] relative">
            <div className="p-5 pt-10 space-y-4 min-h-[520px]">
              {/* Status bar */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>9:41</span>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-2 rounded-sm border border-gray-500 relative">
                    <div className="absolute inset-0.5 right-1 bg-green-500 rounded-sm" />
                  </div>
                </div>
              </div>

              {/* Greeting */}
              <div>
                <p className="text-xs text-gray-500">Good morning</p>
                <p className="text-lg font-bold text-white">
                  Ayesha, <span className="text-red-500">Day 42</span>
                </p>
              </div>

              {/* Progress Ring */}
              <div className="flex items-center gap-4 bg-white/5 rounded-2xl p-4">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg viewBox="0 0 64 64" className="w-full h-full -rotate-90">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                    <circle cx="32" cy="32" r="28" fill="none" stroke="#FF3B30" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${0.73 * 2 * Math.PI * 28} ${2 * Math.PI * 28}`} />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-white">73%</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Focus Score</p>
                  <p className="text-xs text-gray-500">5 of 7 tasks done</p>
                </div>
                <div className="ml-auto flex items-center gap-1 text-amber-500">
                  <Flame width={16} height={16} />
                  <span className="text-sm font-bold">12</span>
                </div>
              </div>

              {/* Subject Cards */}
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'Physics', color: '#3B82F6', progress: 68 },
                  { name: 'Chemistry', color: '#14B8A6', progress: 45 },
                  { name: 'Maths', color: '#F59E0B', progress: 52 },
                  { name: 'Biology', color: '#22C55E', progress: 71 },
                ].map((subject) => (
                  <div key={subject.name} className="bg-white/5 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${subject.color}20` }}>
                        <BookOpen width={12} height={12} style={{ color: subject.color }} />
                      </div>
                      <span className="text-xs font-medium text-white">{subject.name}</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10">
                      <div className="h-full rounded-full" style={{ width: `${subject.progress}%`, background: subject.color }} />
                    </div>
                    <span className="text-[10px] text-gray-500 mt-1 block">{subject.progress}%</span>
                  </div>
                ))}
              </div>

              {/* Today's Tasks */}
              <div>
                <p className="text-xs font-semibold text-gray-400 mb-2">Today&apos;s Tasks</p>
                {[
                  { name: 'Ohm\'s Law', subject: 'Physics', done: true },
                  { name: 'Periodic Table', subject: 'Chemistry', done: false },
                  { name: 'Quadratic Eq.', subject: 'Maths', done: false },
                ].map((task) => (
                  <div key={task.name} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${task.done ? 'bg-green-500 border-green-500' : 'border-gray-600'}`}>
                      {task.done && <Check width={12} height={12} className="text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium ${task.done ? 'text-gray-500 line-through' : 'text-white'}`}>{task.name}</p>
                      <p className="text-[10px] text-gray-600">{task.subject}</p>
                    </div>
                    {!task.done && (
                      <div className="w-6 h-6 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <Play width={10} height={10} className="text-red-500 ml-0.5" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
