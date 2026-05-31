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

const COLOR_TAG: Record<string, { bg: string; text: string }> = {
  'Blue': { bg: 'bg-blue-500/15', text: 'text-blue-400' },
  'Teal': { bg: 'bg-teal-500/15', text: 'text-teal-400' },
  'Purple': { bg: 'bg-purple-500/15', text: 'text-purple-400' },
  'Green': { bg: 'bg-green-500/15', text: 'text-green-400' },
  'Amber': { bg: 'bg-amber-500/15', text: 'text-amber-400' },
};

function ArcProgress({ progress, color, subjectId }: { progress: number; color: string; subjectId: string }) {
  const colorHex = COLOR_HEX[color] || COLOR_HEX['Amber'];
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const isNearCompletion = progress >= 80;
  const gradientId = `arc-grad-${subjectId}`;

  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 56 56">
        <circle
          cx="28" cy="28" r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="text-muted/30"
        />
        <motion.circle
          cx="28" cy="28" r={radius}
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
        <span className={`text-[10px] font-display font-bold ${COLOR_MAP[color]?.text || 'text-amber-500'}`}>
          {progress}%
        </span>
      </div>
    </div>
  );
}

function SubjectCard({ subject, index, onClick }: { subject: SubjectProgress; index: number; onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const colorStyles = COLOR_MAP[subject.color] || COLOR_MAP['Amber'];
  const colorHex = COLOR_HEX[subject.color] || COLOR_HEX['Amber'];
  const colorTag = COLOR_TAG[subject.color] || COLOR_TAG['Amber'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: index * 0.06 }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className="glass rounded-xl p-4 relative overflow-hidden cursor-pointer group"
      style={{
        borderLeft: `3px solid ${colorHex.main}`,
        boxShadow: isHovered ? `0 8px 30px rgba(0,0,0,0.12), 0 0 15px ${colorHex.main}20` : undefined,
      }}
    >
      {/* Hover gradient overlay */}
      <div
        className="absolute inset-0 pointer-events-none rounded-xl transition-opacity duration-300"
        style={{
          background: `linear-gradient(135deg, ${colorHex.main}08 0%, transparent 60%)`,
          opacity: isHovered ? 1 : 0,
        }}
      />

      <div className="flex items-center gap-3 relative z-10">
        {/* Icon */}
        <div className={`inline-flex items-center justify-center w-9 h-9 rounded-xl ${colorStyles.bg}`}>
          <span className="text-base">{subject.icon}</span>
        </div>
        
        {/* Subject name + tag */}
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-bold tracking-tight">{subject.subjectName}</h3>
          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${colorTag.bg} ${colorTag.text}`}>
            {subject.chapterCount} chapters
          </span>
        </div>

        {/* Arc progress */}
        <ArcProgress progress={subject.progressPct} color={subject.color} subjectId={subject.subjectId} />
      </div>

      {/* Progress stats */}
      <div className="flex items-center justify-between mt-3 relative z-10">
        <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden mr-3">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: colorHex.main }}
            initial={{ width: 0 }}
            animate={{ width: `${subject.progressPct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          />
        </div>
        <span className="text-[10px] font-mono text-muted-foreground flex-shrink-0">
          {subject.completedTopics}/{subject.totalTopics}
        </span>
      </div>
    </motion.div>
  );
}

export function SubjectMatrix() {
  const { subjects, openSubjectDetail } = useStudyOS();

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="font-display text-lg font-bold tracking-tight">Courses</h2>
        <span className="text-[10px] text-muted-foreground font-mono px-2 py-0.5 bg-secondary rounded-md">
          {subjects.length} SUBJECTS
        </span>
      </div>

      <div className="space-y-2">
        {subjects.map((subject, index) => (
          <SubjectCard
            key={subject.subjectId}
            subject={subject}
            index={index}
            onClick={() => openSubjectDetail(subject.subjectId)}
          />
        ))}
      </div>
    </div>
  );
}
