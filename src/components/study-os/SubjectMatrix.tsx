'use client';

import { motion } from 'framer-motion';
import { useStudyOS, SubjectProgress } from '@/lib/store';
import { useState } from 'react';

// Color definitions with explicit hex values for SVG
const COLOR_HEX: Record<string, { main: string; light: string }> = {
  'Blue': { main: '#3b82f6', light: '#3b82f6' },
  'Teal': { main: '#14b8a6', light: '#14b8a6' },
  'Purple': { main: '#8b5cf6', light: '#8b5cf6' },
  'Green': { main: '#22c55e', light: '#22c55e' },
  'Amber': { main: '#f59e0b', light: '#f59e0b' },
};

const COLOR_MAP: Record<string, { bg: string; border: string; gradient: string; text: string }> = {
  'Blue': {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    gradient: 'from-blue-500 to-blue-600',
    text: 'text-blue-500',
  },
  'Teal': {
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    gradient: 'from-teal-500 to-teal-600',
    text: 'text-teal-500',
  },
  'Purple': {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    gradient: 'from-purple-500 to-purple-600',
    text: 'text-purple-500',
  },
  'Green': {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    gradient: 'from-green-500 to-green-600',
    text: 'text-green-500',
  },
  'Amber': {
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    gradient: 'from-amber-500 to-amber-600',
    text: 'text-amber-500',
  },
};

function ArcProgress({ progress, color, subjectId }: { progress: number; color: string; subjectId: string }) {
  const colorHex = COLOR_HEX[color] || COLOR_HEX['Amber'];
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const isNearCompletion = progress >= 80;
  const gradientId = `arc-grad-${subjectId}`;

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
        <circle
          cx="32" cy="32" r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/30"
        />
        <motion.circle
          cx="32" cy="32" r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={isNearCompletion ? 4 : 3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={isNearCompletion ? 'drop-shadow-lg' : ''}
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colorHex.main} />
            <stop offset="100%" stopColor={colorHex.light} stopOpacity={0.6} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={`text-xs font-display font-bold ${COLOR_MAP[color]?.text || 'text-amber-500'}`}>
          {progress}%
        </span>
      </div>
    </div>
  );
}

function SubjectCard({ subject, index }: { subject: SubjectProgress; index: number }) {
  const [isHovered, setIsHovered] = useState(false);
  const colorStyles = COLOR_MAP[subject.color] || COLOR_MAP['Amber'];
  const colorHex = COLOR_HEX[subject.color] || COLOR_HEX['Amber'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{
        y: -4,
        transition: { duration: 0.2 },
      }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="glass rounded-2xl p-5 relative overflow-hidden cursor-pointer group"
      style={{
        borderLeft: `3px solid ${colorHex.main}`,
        boxShadow: isHovered ? `0 12px 40px rgba(0,0,0,0.12), 0 0 20px ${colorHex.main}20` : undefined,
      }}
    >
      {/* Hover gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${colorHex.main}08 0%, transparent 60%)`,
          opacity: isHovered ? 1 : 0,
        }}
      />

      {/* Top-left squircle icon */}
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${colorStyles.bg} mb-3 relative z-10`}>
        <span className="text-xl">{subject.icon}</span>
      </div>

      {/* Subject info */}
      <h3 className="font-display text-base font-bold tracking-tight relative z-10">{subject.subjectName}</h3>
      <p className="text-xs text-muted-foreground font-mono mt-0.5 relative z-10">
        {subject.chapters.length} chapters · {subject.color}
      </p>

      {/* Progress arc + stats row */}
      <div className="flex items-center justify-between mt-4 relative z-10">
        <ArcProgress progress={subject.progressPct} color={subject.color} subjectId={subject.subjectId} />
        <div className="text-right">
          <p className="text-2xl font-display font-bold">
            {subject.completedTopics}<span className="text-muted-foreground text-sm">/{subject.totalTopics}</span>
          </p>
          <p className="text-xs text-muted-foreground font-mono">TOPICS DONE</p>
        </div>
      </div>

      {/* Chapter progress dots */}
      <div className="flex gap-1 mt-3 relative z-10">
        {subject.chapters.slice(0, 10).map((ch) => (
          <div
            key={ch.id}
            className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${
              ch.completedTopics === ch.totalTopics && ch.totalTopics > 0
                ? `bg-gradient-to-r ${colorStyles.gradient}`
                : ch.completedTopics > 0
                ? `${colorStyles.bg}`
                : 'bg-muted/30'
            }`}
            title={`Ch ${ch.number}: ${ch.name} (${ch.completedTopics}/${ch.totalTopics})`}
          />
        ))}
        {subject.chapters.length > 10 && (
          <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30 self-center" />
        )}
      </div>
    </motion.div>
  );
}

export function SubjectMatrix() {
  const { subjects } = useStudyOS();

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="font-display text-lg font-bold tracking-tight">Subject Matrix</h2>
        <span className="text-xs text-muted-foreground font-mono px-2 py-0.5 bg-secondary rounded-md">
          {subjects.length} SUBJECTS
        </span>
      </div>

      {/* Bento Grid - Physics & Chemistry get 2 cols on lg, rest get 1 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {subjects.map((subject, index) => {
          // First and fourth items span 2 columns on large screens for bento effect
          const isWide = index === 0 || index === 3;
          return (
            <div key={subject.subjectId} className={isWide ? 'lg:col-span-2' : ''}>
              <SubjectCard subject={subject} index={index} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
