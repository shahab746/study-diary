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
  const ringSize = 220;
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
            className="fixed inset-0 z-[100]"
            style={{ background: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)' }}
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
            <div
              className="rounded-3xl p-6 sm:p-8 w-full max-w-sm relative shadow-2xl"
              style={{
                background: 'rgba(17, 24, 39, 0.95)',
                backdropFilter: 'blur(24px)',
                border: '1px solid var(--border, rgba(255,255,255,0.08))',
              }}
            >
              {/* Subtle gradient glow behind the card */}
              <div
                className="absolute inset-0 rounded-3xl opacity-20 pointer-events-none"
                style={{
                  background: 'radial-gradient(ellipse at 50% 0%, rgba(124, 58, 237, 0.3) 0%, transparent 60%)',
                }}
              />

              {/* Close button */}
              <button
                onClick={() => {
                  setIsRunning(false);
                  onClose();
                }}
                className="absolute top-4 right-4 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  color: 'var(--text-muted, #64748B)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.color = 'var(--text-primary, #F8FAFC)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.color = 'var(--text-muted, #64748B)';
                }}
              >
                <X className="w-4 h-4" />
              </button>

              {/* Header */}
              <div className="flex items-center gap-2.5 mb-6 relative">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{
                    background: 'linear-gradient(135deg, #3B82F6, #7C3AED)',
                    boxShadow: '0 4px 12px rgba(124, 58, 237, 0.35)',
                  }}
                >
                  <Timer className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <h2
                    className="font-display text-lg font-bold tracking-tight"
                    style={{ color: 'var(--text-primary, #F8FAFC)' }}
                  >
                    Focus Timer
                  </h2>
                  <p
                    className="text-[10px] font-mono"
                    style={{ color: 'var(--text-muted, #64748B)' }}
                  >
                    POMODORO SESSION
                  </p>
                </div>
              </div>

              {/* Timer ring */}
              <div className="flex justify-center mb-6 relative">
                <div className="relative" style={{ width: ringSize, height: ringSize }}>
                  {/* Outer glow effect */}
                  {isRunning && (
                    <motion.div
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: 'radial-gradient(circle, rgba(124, 58, 237, 0.12) 0%, transparent 70%)',
                      }}
                      animate={{ scale: [1, 1.05, 1], opacity: [0.5, 0.8, 0.5] }}
                      transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />
                  )}

                  <svg
                    className="transform -rotate-90 relative z-10"
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
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth={strokeWidth}
                    />
                    {/* Progress ring */}
                    <motion.circle
                      cx={ringSize / 2}
                      cy={ringSize / 2}
                      r={radius}
                      fill="none"
                      stroke="url(#focus-timer-gradient)"
                      strokeWidth={strokeWidth + 1.5}
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      style={{
                        filter: 'drop-shadow(0 0 8px rgba(124, 58, 237, 0.5))',
                      }}
                    />
                    <defs>
                      <linearGradient id="focus-timer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3B82F6" />
                        <stop offset="100%" stopColor="#7C3AED" />
                      </linearGradient>
                    </defs>
                  </svg>

                  {/* Center content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                    {isComplete ? (
                      <motion.div
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                        className="flex flex-col items-center"
                      >
                        <CheckCircle2
                          className="w-10 h-10 mb-2"
                          style={{ color: '#7C3AED' }}
                        />
                        <span
                          className="text-sm font-display font-semibold"
                          style={{ color: 'var(--text-primary, #F8FAFC)' }}
                        >
                          Session Complete!
                        </span>
                      </motion.div>
                    ) : (
                      <>
                        <motion.span
                          key={timeLeft}
                          initial={{ opacity: 0.8 }}
                          animate={{ opacity: 1 }}
                          className="text-4xl font-display font-bold tabular-nums tracking-tight"
                          style={{ color: 'var(--text-primary, #F8FAFC)' }}
                        >
                          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                        </motion.span>
                        <span
                          className="text-[10px] font-mono mt-1 tracking-widest"
                          style={{ color: 'var(--text-muted, #64748B)' }}
                        >
                          {isRunning ? 'FOCUSING' : 'PAUSED'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Duration selector */}
              <div className="flex gap-2 mb-6 relative">
                {TIMER_OPTIONS.map((opt) => (
                  <motion.button
                    key={opt.minutes}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelectMinutes(opt.minutes)}
                    disabled={isRunning}
                    className="flex-1 py-2.5 rounded-xl text-sm font-display font-semibold transition-all duration-200"
                    style={{
                      ...(selectedMinutes === opt.minutes
                        ? {
                            background: 'linear-gradient(135deg, #3B82F6, #7C3AED)',
                            color: '#FFFFFF',
                            boxShadow: '0 4px 16px rgba(124, 58, 237, 0.35)',
                          }
                        : {
                            background: 'rgba(255, 255, 255, 0.04)',
                            color: 'var(--text-secondary, #94A3B8)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                          }),
                      ...(isRunning ? { opacity: 0.5, cursor: 'not-allowed' } : {}),
                    }}
                    onMouseEnter={(e) => {
                      if (isRunning || selectedMinutes === opt.minutes) return;
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                      e.currentTarget.style.color = 'var(--text-primary, #F8FAFC)';
                    }}
                    onMouseLeave={(e) => {
                      if (isRunning || selectedMinutes === opt.minutes) return;
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                      e.currentTarget.style.color = 'var(--text-secondary, #94A3B8)';
                    }}
                  >
                    {opt.label}
                  </motion.button>
                ))}
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-3 relative">
                {/* Reset button - glass style */}
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleReset}
                  className="w-11 h-11 rounded-xl flex items-center justify-center transition-colors"
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    color: 'var(--text-muted, #64748B)',
                    backdropFilter: 'blur(10px)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = 'var(--text-secondary, #94A3B8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = 'var(--text-muted, #64748B)';
                  }}
                >
                  <RotateCcw className="w-4 h-4" />
                </motion.button>

                {/* Play/Pause button */}
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={handleStartPause}
                  className="w-16 h-16 rounded-2xl flex items-center justify-center text-white transition-all"
                  style={{
                    background: isRunning
                      ? 'linear-gradient(135deg, #475569, #334155)'
                      : 'linear-gradient(135deg, #3B82F6, #7C3AED)',
                    boxShadow: isRunning
                      ? '0 4px 15px rgba(71, 85, 105, 0.3)'
                      : '0 4px 20px rgba(124, 58, 237, 0.4), 0 0 40px rgba(59, 130, 246, 0.15)',
                  }}
                >
                  {isRunning ? (
                    <Pause className="w-6 h-6" />
                  ) : (
                    <Play className="w-6 h-6 ml-0.5" />
                  )}
                </motion.button>

                {/* Spacer for centering */}
                <div className="w-11 h-11" />
              </div>

              {/* Session info */}
              <div className="mt-5 text-center relative">
                <p
                  className="text-[10px] font-mono tracking-wide"
                  style={{ color: 'var(--text-muted, #64748B)' }}
                >
                  {selectedMinutes} MIN FOCUS SESSION · STAY IN THE ZONE
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
