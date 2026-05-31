'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useStudyOS } from '@/lib/store';
import { Header } from '@/components/study-os/Header';
import { PacingEngineCard } from '@/components/study-os/PacingEngineCard';
import { SubjectMatrix } from '@/components/study-os/SubjectMatrix';
import { TodayTimeline } from '@/components/study-os/TodayTimeline';
import { PerformanceChart } from '@/components/study-os/PerformanceChart';
import { RevisionDock } from '@/components/study-os/RevisionDock';
import { Target, Calendar, Flame } from 'lucide-react';

function StatCard({
  icon,
  label,
  value,
  subtext,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="glass rounded-xl p-4 flex items-center gap-3"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-mono">{label}</p>
        <p className="font-display font-bold text-lg leading-tight">{value}</p>
        {subtext && <p className="text-[10px] text-muted-foreground font-mono">{subtext}</p>}
      </div>
    </motion.div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="glass sticky top-0 z-50 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary animate-pulse" />
              <div>
                <div className="w-20 h-4 bg-secondary rounded animate-pulse" />
                <div className="w-32 h-3 bg-secondary rounded animate-pulse mt-1" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass rounded-xl p-4 h-20 animate-pulse" />
          ))}
        </div>
        <div className="glass rounded-2xl p-6 h-48 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="glass rounded-2xl p-5 h-48 animate-pulse" />
          ))}
        </div>
        <div className="glass rounded-xl p-4 h-64 animate-pulse" />
      </div>
    </div>
  );
}

export default function Home() {
  const { fetchData, isLoading, student, totalCompleted, totalTopics, topicsPerDay } = useStudyOS();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (isLoading) return <LoadingSkeleton />;

  const overallPct = totalTopics > 0 ? Math.round((totalCompleted / totalTopics) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-5 space-y-6">
        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            icon={<Target className="w-5 h-5" />}
            label="COMPLETION"
            value={`${overallPct}%`}
            subtext={`${totalCompleted} of ${totalTopics} topics`}
            delay={0}
          />
          <StatCard
            icon={<Flame className="w-5 h-5" />}
            label="PACE"
            value={`${topicsPerDay}/day`}
            subtext="topics to complete"
            delay={0.05}
          />
          <StatCard
            icon={<Calendar className="w-5 h-5" />}
            label="DAYS LEFT"
            value={student?.daysLeft || 423}
            subtext={`of ${student?.totalDays || 438} total`}
            delay={0.1}
          />
          <StatCard
            icon={<Target className="w-5 h-5" />}
            label="CURRENT DAY"
            value={student?.currentDay || 16}
            subtext={`started ${student?.startDate ? new Date(student.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}`}
            delay={0.15}
          />
        </div>

        {/* Main Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column - Pacing + Performance */}
          <div className="space-y-5">
            <PacingEngineCard />
            <PerformanceChart />
          </div>

          {/* Center + Right - Subject Matrix (2 columns) */}
          <div className="lg:col-span-2">
            <SubjectMatrix />
          </div>
        </div>

        {/* Today's Mission Feed */}
        <div className="glass-strong rounded-2xl p-5">
          <TodayTimeline />
        </div>

        {/* Revision Dock */}
        <div className="glass rounded-2xl p-5">
          <RevisionDock />
        </div>
      </main>

      {/* Sticky Footer */}
      <footer className="mt-auto border-t border-border glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground font-mono">
            <span>Study OS v1.0</span>
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Synced · {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
