'use client';

import { motion } from 'framer-motion';
import { useStudyOS } from '@/lib/store';
import { Star, Clock, Plus } from 'lucide-react';

function getGreeting(): { text: string; emoji: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good morning', emoji: '🌅' };
  if (hour < 17) return { text: 'Good afternoon', emoji: '☀️' };
  return { text: 'Good evening', emoji: '🌙' };
}

function getFormattedDate(): string {
  const now = new Date();
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
}

function ProgressRing({ progress, size = 48, strokeWidth = 3 }: { progress: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const gradientId = 'welcome-ring-grad';

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="-rotate-90" style={{ width: size, height: size }} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted/30"
        />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth + 0.5}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.6} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[10px] font-display font-bold text-primary">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
}

export function WelcomeCard() {
  const { student, todayTasks, totalCompleted, totalTopics, subjects, openSubjectDetail, setHighlightTopicId, setFocusTimerOpen } = useStudyOS();
  const { text: greetingText, emoji: greetingEmoji } = getGreeting();
  const dateStr = getFormattedDate();
  const firstName = student?.name || 'Student';

  // Progress calculation
  const overallProgress = totalTopics > 0 ? (totalCompleted / totalTopics) * 100 : 0;

  // Find the next uncompleted task
  const nextTask = todayTasks.find(t => !t.completed);

  // Day counter
  const currentDay = student?.currentDay ?? 0;
  const totalDays = student?.totalDays ?? 0;

  // Handle "Start next best task" click
  const handleNextBestTask = () => {
    if (!nextTask) return;

    // Find the subject that matches this task's subject name
    const matchingSubject = subjects.find(s => s.subjectName === nextTask.subjectName);
    if (matchingSubject) {
      // Set highlight topic so the subject detail knows which topic to scroll to
      setHighlightTopicId(nextTask.topicId);
      openSubjectDetail(matchingSubject.subjectId);
    }
  };

  // Handle "Focus" click - open pomodoro timer
  const handleFocusClick = () => {
    setFocusTimerOpen(true);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-2xl overflow-hidden glass"
    >
      {/* Animated gradient background */}
      <div className="absolute inset-0 animated-gradient-bg" />
      <div className="absolute inset-0 bg-card/80 backdrop-blur-xl" />

      <div className="relative p-6 lg:p-8">
        {/* Top row: Date + Day badge + Progress ring */}
        <div className="flex items-start justify-between mb-3">
          <div>
            {/* Date */}
            <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-1">{dateStr}</p>
            {/* Day counter badge */}
            {totalDays > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary tracking-wider">
                Day {currentDay} of {totalDays}
              </span>
            )}
          </div>
          {/* Progress ring */}
          <ProgressRing progress={overallProgress} size={48} strokeWidth={3} />
        </div>

        {/* Greeting with time emoji */}
        <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight flex items-center gap-2">
          <span className="text-xl lg:text-2xl">{greetingEmoji}</span>
          {greetingText}, <span className="text-primary">{firstName}</span>.
        </h1>

        {/* Next task */}
        {nextTask && (
          <p className="text-sm text-muted-foreground mt-2 max-w-lg">
            Your next move is <span className="text-foreground font-medium">{nextTask.topicName}</span> in{' '}
            <span className="text-foreground font-medium">{nextTask.subjectName}</span>.
          </p>
        )}

        {!nextTask && todayTasks.length > 0 && (
          <p className="text-sm text-muted-foreground mt-2 max-w-lg">
            All today&apos;s tasks are complete! Great work 🎉
          </p>
        )}

        {!nextTask && todayTasks.length === 0 && (
          <p className="text-sm text-muted-foreground mt-2 max-w-lg">
            No tasks scheduled for today. Start a focus session or explore your courses.
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-5">
          {nextTask && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleNextBestTask}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-display font-semibold shadow-lg transition-all relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
                color: '#090A0F',
                boxShadow: '0 4px 20px rgba(251, 191, 36, 0.35), 0 0 40px rgba(251, 191, 36, 0.1)',
              }}
            >
              <Star className="w-4 h-4" />
              Start next best task
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleFocusClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-display font-semibold hover:bg-secondary/80 transition-colors"
          >
            <Clock className="w-4 h-4" />
            Focus
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Overall progress bar */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono text-muted-foreground tracking-wider">OVERALL PROGRESS</span>
            <span className="text-[10px] font-mono text-primary font-bold">{totalCompleted}/{totalTopics}</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #FBBF24, #F59E0B)',
              }}
              initial={{ width: 0 }}
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
