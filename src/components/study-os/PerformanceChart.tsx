'use client';

import { motion } from 'framer-motion';
import { useStudyOS } from '@/lib/store';
import { useState } from 'react';

export function PerformanceChart() {
  const { performanceData } = useStudyOS();
  const [hoveredBar, setHoveredBar] = useState<number | null>(null);

  // Fallback data if no performance data yet
  const chartData = performanceData.length > 0
    ? performanceData
    : [
        { month: 'May', lectures: 0 },
        { month: 'Jun', lectures: 0 },
        { month: 'Jul', lectures: 0 },
      ];

  const maxLectures = Math.max(...chartData.map(d => d.lectures), 1);

  return (
    <div className="glass-strong rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-bold tracking-tight">Performance</h2>
        <span className="text-xs text-muted-foreground font-mono px-2 py-0.5 bg-secondary rounded-md">
          LECTURES/MONTH
        </span>
      </div>

      <div className="flex items-end gap-4 h-32 px-2">
        {chartData.map((data, index) => {
          const height = maxLectures > 0 ? (data.lectures / maxLectures) * 100 : 0;
          const minVisibleHeight = data.lectures > 0 ? 8 : 3;
          const isHovered = hoveredBar === index;

          return (
            <div
              key={data.month}
              className="flex-1 flex flex-col items-center gap-2"
              onMouseEnter={() => setHoveredBar(index)}
              onMouseLeave={() => setHoveredBar(null)}
            >
              {/* Tooltip */}
              {isHovered && data.lectures > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs font-display font-bold text-primary bg-primary/10 px-2 py-1 rounded-md"
                >
                  {data.lectures} lectures
                </motion.div>
              )}

              {/* Bar */}
              <div className="w-full flex items-end justify-center" style={{ height: '80px' }}>
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(height, minVisibleHeight)}%` }}
                  transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
                  className={`w-full max-w-[48px] rounded-t-lg transition-colors duration-200 ${
                    isHovered
                      ? 'bg-primary'
                      : 'bg-primary/40'
                  }`}
                  style={{ minHeight: `${minVisibleHeight}px` }}
                />
              </div>

              {/* Month label */}
              <span className="text-xs font-mono text-muted-foreground">{data.month}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
