'use client';

import { motion } from 'framer-motion';
import { useStudyOS, SubjectProgress } from '@/lib/store';
import { useState } from 'react';
import { BookOpen, Play, ChevronRight } from 'lucide-react';

// Color definitions with explicit hex values for SVG and glows
const COLOR_HEX: Record<string, { main: string; light: string; rgb: string }> = {
  'Blue':   { main: '#3b82f6', light: '#60a5fa', rgb: '59,130,246' },
  'Teal':   { main: '#14b8a6', light: '#2dd4bf', rgb: '20,184,166' },
  'Purple': { main: '#8b5cf6', light: '#a78bfa', rgb: '139,92,246' },
  'Green':  { main: '#22c55e', light: '#4ade80', rgb: '34,197,94' },
  'Amber':  { main: '#f59e0b', light: '#fbbf24', rgb: '245,158,11' },
};

// Tinted 10% opacity badge backgrounds
const COLOR_BADGE: Record<string, { bg: string; text: string; border: string }> = {
  'Blue':   { bg: 'rgba(59,130,246,0.10)',  text: '#60a5fa', border: 'rgba(59,130,246,0.15)' },
  'Teal':   { bg: 'rgba(20,184,166,0.10)',   text: '#2dd4bf', border: 'rgba(20,184,166,0.15)' },
  'Purple': { bg: 'rgba(139,92,246,0.10)',   text: '#a78bfa', border: 'rgba(139,92,246,0.15)' },
  'Green':  { bg: 'rgba(34,197,94,0.10)',    text: '#4ade80', border: 'rgba(34,197,94,0.15)' },
  'Amber':  { bg: 'rgba(245,158,11,0.10)',   text: '#fbbf24', border: 'rgba(245,158,11,0.15)' },
};

function ArcProgress({ progress, color, subjectId }: { progress: number; color: string; subjectId: string }) {
  const colorHex = COLOR_HEX[color] || COLOR_HEX['Amber'];
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const gradientId = `arc-grad-${subjectId}`;

  return (
    <div className="relative w-11 h-11 flex items-center justify-center flex-shrink-0">
      <svg className="w-11 h-11 -rotate-90" viewBox="0 0 48 48">
        {/* Track */}
        <circle
          cx="24" cy="24" r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="3"
        />
        {/* Progress arc */}
        <motion.circle
          cx="24" cy="24" r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colorHex.main} />
            <stop offset="100%" stopColor={colorHex.light} stopOpacity={0.7} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold tabular-nums" style={{ color: colorHex.light }}>
          {progress}%
        </span>
      </div>
    </div>
  );
}

function SubjectCard({ subject, index, onClick }: { subject: SubjectProgress; index: number; onClick: () => void }) {
  const [isHovered, setIsHovered] = useState(false);
  const colorHex = COLOR_HEX[subject.color] || COLOR_HEX['Amber'];
  const colorBadge = COLOR_BADGE[subject.color] || COLOR_BADGE['Amber'];

  // Count video/pdf availability from the subject (if available)
  const hasVideo = subject.totalTopics > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05, ease: [0.25, 0.46, 0.45, 0.94] }}
      whileHover={{ y: -2, transition: { duration: 0.18 } }}
      whileTap={{ scale: 0.985 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      className="relative rounded-2xl cursor-pointer group overflow-hidden"
      style={{
        background: 'rgba(24, 24, 27, 0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid rgba(255,255,255,0.03)',
        boxShadow: isHovered
          ? `0 8px 32px rgba(0,0,0,0.25), 0 0 20px rgba(${colorHex.rgb},0.08)`
          : `0 1px 3px rgba(0,0,0,0.12)`,
        transition: 'box-shadow 0.3s ease',
      }}
    >
      {/* Radial glow in top-left corner */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 0% 0%, rgba(${colorHex.rgb},0.08) 0%, transparent 70%)`,
          transition: 'opacity 0.3s ease',
          opacity: isHovered ? 1 : 0.6,
        }}
      />

      {/* Main content */}
      <div className="relative z-10 p-4 pb-3">
        <div className="flex items-center gap-3">
          {/* Icon with tinted bg */}
          <div
            className="inline-flex items-center justify-center w-9 h-9 rounded-xl flex-shrink-0"
            style={{
              background: colorBadge.bg,
              border: `1px solid ${colorBadge.border}`,
            }}
          >
            <span className="text-base leading-none">{subject.icon}</span>
          </div>

          {/* Subject name + meta */}
          <div className="flex-1 min-w-0">
            <h3 className="text-[13px] font-semibold tracking-tight text-white/95 truncate">
              {subject.subjectName}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              {/* Chapter badge — 10% opacity tinted */}
              <span
                className="text-[9px] font-medium px-1.5 py-[2px] rounded-md leading-none"
                style={{
                  background: colorBadge.bg,
                  color: colorBadge.text,
                  border: `1px solid ${colorBadge.border}`,
                }}
              >
                {subject.chapterCount || 0} chapters
              </span>
              {/* Muted metrics */}
              <span className="text-[9px] font-mono text-white/25 tabular-nums">
                {subject.completedTopics}/{subject.totalTopics}
              </span>
              {hasVideo && (
                <span className="flex items-center gap-0.5 text-[9px] font-mono text-white/25">
                  <Play className="w-2.5 h-2.5" />
                </span>
              )}
            </div>
          </div>

          {/* Arc progress + chevron */}
          <div className="flex items-center gap-1.5">
            <ArcProgress progress={subject.progressPct} color={subject.color} subjectId={subject.subjectId} />
            <ChevronRight
              className="w-3.5 h-3.5 text-white/15 transition-colors duration-200 group-hover:text-white/40"
            />
          </div>
        </div>
      </div>

      {/* Premium progress track at bottom */}
      <div className="relative z-10 h-[3px] w-full" style={{ background: 'rgba(255,255,255,0.04)' }}>
        <motion.div
          className="h-full"
          style={{
            background: `linear-gradient(90deg, ${colorHex.main}, ${colorHex.light})`,
            borderBottomLeftRadius: subject.progressPct >= 100 ? '0' : '0',
            borderBottomRightRadius: '0',
            borderTopLeftRadius: '0',
            borderTopRightRadius: '0',
          }}
          initial={{ width: 0 }}
          animate={{ width: `${subject.progressPct}%` }}
          transition={{ duration: 0.9, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.2 }}
        />
      </div>
    </motion.div>
  );
}

export function SubjectMatrix() {
  const { subjects, openSubjectDetail } = useStudyOS();

  const totalTopics = subjects.reduce((s, sub) => s + sub.totalTopics, 0);
  const totalCompleted = subjects.reduce((s, sub) => s + sub.completedTopics, 0);
  const overallPct = totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center border border-white/[0.06]">
            <BookOpen className="w-4 h-4 text-white/50" />
          </div>
          <div>
            <h2 className="text-base font-semibold tracking-tight text-white/95">Courses</h2>
            <p className="text-[9px] font-mono text-white/25 mt-0.5">
              {subjects.length} subjects · {overallPct}% complete
            </p>
          </div>
        </div>
        <div
          className="text-[9px] font-mono px-2 py-1 rounded-md"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.4)',
          }}
        >
          {totalCompleted}/{totalTopics}
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-2.5">
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
