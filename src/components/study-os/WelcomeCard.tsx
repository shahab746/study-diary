'use client';

import { motion } from 'framer-motion';
import { useStudyOS } from '@/lib/store';
import { Star, Clock, Plus } from 'lucide-react';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getFormattedDate(): string {
  const now = new Date();
  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}`;
}

export function WelcomeCard() {
  const { student, todayTasks } = useStudyOS();
  const greeting = getGreeting();
  const dateStr = getFormattedDate();
  const firstName = student?.name || 'Student';
  
  // Find the next uncompleted task
  const nextTask = todayTasks.find(t => !t.completed);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative rounded-2xl overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
      <div className="absolute inset-0 bg-card/80 backdrop-blur-xl" />
      
      <div className="relative p-6 lg:p-8">
        {/* Date */}
        <p className="text-[10px] font-mono text-muted-foreground tracking-widest mb-2">{dateStr}</p>
        
        {/* Greeting */}
        <h1 className="font-display text-2xl lg:text-3xl font-bold tracking-tight">
          {greeting}, <span className="text-primary">{firstName}</span>.
        </h1>
        
        {/* Next task */}
        {nextTask && (
          <p className="text-sm text-muted-foreground mt-2 max-w-lg">
            Your next move is <span className="text-foreground font-medium">{nextTask.topicName}</span> in{' '}
            <span className="text-foreground font-medium">{nextTask.subjectName}</span>.
          </p>
        )}
        
        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-5">
          {nextTask && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-display font-semibold shadow-lg shadow-primary/25 hover:bg-primary/90 transition-colors"
            >
              <Star className="w-4 h-4" />
              Start next best task
            </motion.button>
          )}
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary text-secondary-foreground text-sm font-display font-semibold hover:bg-secondary/80 transition-colors"
          >
            <Clock className="w-4 h-4" />
            Focus 25m
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
