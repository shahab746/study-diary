'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Play, Pause, RotateCcw, CheckCircle2, Timer } from 'lucide-react';

interface FocusTimerProps {
  isOpen: boolean;
  onClose: () => void;
}

const TIMER_OPTIONS = [
  { label: '10m', minutes: 10 },
  { label: '15m', minutes: 15 },
  { label: '25m', minutes: 25 },
];

export function FocusTimer({ isOpen, onClose }: FocusTimerProps) {
  const [selectedMinutes, setSelectedMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Create audio for completion
  useEffect(() => {
    if (typeof window !== 'undefined') {
      audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbsGczHjqImsSyYD8mPYmhw7dbNyxBg5y7tFwvJz+DncG3WC0nPoOdwLZbLig/hJ3At1ouKD+EncC3Wy4oP4SdwLdbLig/hJ3At1suKD+EncC3Wy4oP4SdwLdbLig/hJ3At1suKD+EncC3Wy4oP4SdwLdbLig/hJ3At1suKD+EncC3Wy4oP4SdwLdbLig/hJ3At1suKD+EncC3Wy4oP4SdwLdbLig/hJ3At1suKD+EncC3');
    }
  }, []);

  const totalTime = selectedMinutes * 60;
  const progress = totalTime > 0 ? ((totalTime - timeLeft) / totalTime) * 100 : 0;
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  const handleSelectMinutes = useCallback((mins: number) => {
    if (isRunning) return;
    setSelectedMinutes(mins);
    setTimeLeft(mins * 60);
    setIsComplete(false);
  }, [isRunning]);

  const handleStartPause = useCallback(() => {
    if (isComplete) {
      setTimeLeft(selectedMinutes * 60);
      setIsComplete(false);
    }
    setIsRunning(prev => !prev);
  }, [isComplete, selectedMinutes]);

  const handleReset = useCallback(() => {
    setIsRunning(false);
    setTimeLeft(selectedMinutes * 60);
    setIsComplete(false);
  }, [selectedMinutes]);

  // Timer tick
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            setIsComplete(true);
            // Try to play sound
            try { audioRef.current?.play(); } catch {}
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, timeLeft]);

  // Close on escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsRunning(false);
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Ring SVG params
  const ringSize = 200;
  const strokeWidth = 6;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setIsRunning(false);
              onClose();
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4"
          >
            <div className="glass-strong rounded-3xl p-6 sm:p-8 w-full max-w-sm relative border border-[rgba(248,250,252,0.06)] shadow-2xl" style={{ background: 'rgba(18, 20, 31, 0.95)' }}>
              {/* Close button */}
              <button
                onClick={() => {
                  setIsRunning(false);
                  onClose();
                }}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-secondary flex items-center justify-center hover:bg-secondary/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-2.5 mb-6">
                <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                  <Timer className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold tracking-tight">Focus Timer</h2>
                  <p className="text-[10px] font-mono text-muted-foreground">Pomodoro session</p>
                </div>
              </div>

              {/* Timer ring */}
              <div className="flex justify-center mb-6">
                <div className="relative" style={{ width: ringSize, height: ringSize }}>
                  <svg
                    className="transform -rotate-90"
                    width={ringSize}
                    height={ringSize}
                    viewBox={`0 0 ${ringSize} ${ringSize}`}
                  >
                    {/* Background ring */}
                    <circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={radius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={strokeWidth}
                      className="text-secondary"
                    />
                    {/* Progress ring */}
                    <motion.circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={radius}
                      fill="none"
                      stroke="url(#focus-timer-gradient)"
                      strokeWidth={strokeWidth + 1}
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                    <defs>
                      <linearGradient id="focus-timer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#f59e0b" />
                        <stop offset="100%" stopColor="#d97706" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Center content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    {isComplete ? (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="flex flex-col items-center"
                      >
                        <CheckCircle2 className="w-10 h-10 text-primary mb-2" />
                        <span className="text-sm font-display font-semibold text-primary">Session Complete!</span>
                      </motion.div>
                    ) : (
                      <>
                        <motion.span
                          key={timeLeft}
                          initial={{ opacity: 0.8 }}
                          animate={{ opacity: 1 }}
                          className="text-4xl font-display font-bold tabular-nums tracking-tight"
                        >
                          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                        </motion.span>
                        <span className="text-[10px] font-mono text-muted-foreground mt-1">
                          {isRunning ? 'FOCUSING' : 'PAUSED'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Duration selector */}
              <div className="flex gap-2 mb-6">
                {TIMER_OPTIONS.map((opt) => (
                  <motion.button
                    key={opt.minutes}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelectMinutes(opt.minutes)}
                    disabled={isRunning}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-display font-semibold transition-all duration-200 ${
                      selectedMinutes === opt.minutes
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    } ${isRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {opt.label}
                  </motion.button>
                ))}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleReset}
                  className="w-11 h-11 rounded-xl bg-secondary flex items-center justify-center text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                </motion.button>

                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={handleStartPause}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg transition-all"
                  style={{
                    background: isRunning
                      ? 'linear-gradient(135deg, #64748B, #475569)'
                      : 'linear-gradient(135deg, #FBBF24, #F59E0B)',
                    boxShadow: isRunning
                      ? '0 4px 15px rgba(100, 116, 139, 0.3)'
                      : '0 4px 20px rgba(251, 191, 36, 0.35), 0 0 40px rgba(251, 191, 36, 0.1)',
                  }}
                >
                  {isRunning ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-0.5" />
                  )}
                </motion.button>

                <div className="w-11 h-11" /> {/* Spacer for centering */}
              </div>

              {/* Session info */}
              <div className="mt-5 text-center">
                <p className="text-[10px] font-mono text-muted-foreground">
                  {selectedMinutes} min focus session · Stay in the zone
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
