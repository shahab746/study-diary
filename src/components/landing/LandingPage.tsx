'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useInView } from 'framer-motion';
import {
  BookOpenText,
  Menu,
  X,
  CalendarCheck,
  Play,
  Timer,
  BarChart3,
  WifiOff,
  GraduationCap,
  Check,
  Plus,
  Sparkles,
  Flame,
  Target,
  TrendingUp,
  ArrowRight,
  Star,
  Zap,
  Lock,
  Users,
  Crown,
  Rocket,
  Shield,
  Smartphone,
  ChevronDown,
  Heart,
} from 'lucide-react';

// ============================================
// ANIMATION VARIANTS
// ============================================
const sectionVariants = {
  hidden: { opacity: 0, y: 40 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const staggerItem = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

const fadeInScale = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};

// ============================================
// FLOATING CARDS COMPONENT
// ============================================
function FloatingCards() {
  return (
    <div className="relative h-[400px] w-full md:h-[500px]">
      {/* Main hero image */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="relative z-10 mx-auto h-full max-w-md md:max-w-lg"
      >
        <img
          src="/hero-student.png"
          alt="Student using Study Diary app"
          className="h-full w-full object-contain drop-shadow-2xl"
        />
      </motion.div>

      {/* Floating metric card - Focus Score */}
      <motion.div
        initial={{ opacity: 0, x: -30, y: 20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 0.5, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="absolute top-8 left-0 z-20 hidden md:block"
      >
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF3B30]/20">
              <Target className="h-5 w-5 text-[#FF3B30]" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400">Focus Score</p>
              <p className="text-xl font-bold text-white">87%</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Floating metric card - Streak */}
      <motion.div
        initial={{ opacity: 0, x: 30, y: -20 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 0.7, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="absolute right-0 top-16 z-20 hidden md:block"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/20">
              <Flame className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400">Streak</p>
              <p className="text-xl font-bold text-white">12 days</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Floating metric card - Progress */}
      <motion.div
        initial={{ opacity: 0, x: -20, y: 30 }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{ delay: 0.9, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="absolute bottom-16 left-4 z-20 hidden md:block"
      >
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur-xl"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400">Progress</p>
              <p className="text-xl font-bold text-white">234/389</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}

// ============================================
// FAQ ITEM COMPONENT
// ============================================
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <motion.div variants={staggerItem} className="border-b border-white/5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-6 text-left transition-colors hover:text-white"
      >
        <span className="pr-8 text-lg font-medium text-zinc-200">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/5"
        >
          <Plus className="h-4 w-4 text-zinc-400" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <p className="pb-6 text-base leading-relaxed text-zinc-400">{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// DASHBOARD MOCKUP COMPONENT
// ============================================
function DashboardMockup() {
  return (
    <div className="relative mx-auto max-w-4xl">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 shadow-2xl backdrop-blur-xl"
      >
        {/* Mockup top bar */}
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
          <div className="h-3 w-3 rounded-full bg-red-500/60" />
          <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
          <div className="h-3 w-3 rounded-full bg-green-500/60" />
          <div className="ml-4 flex-1 rounded-md bg-white/5 px-3 py-1">
            <span className="text-xs text-zinc-500">studydiary.app/dashboard</span>
          </div>
        </div>

        {/* Mockup content */}
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3">
          {/* Sidebar mockup */}
          <div className="hidden space-y-3 rounded-xl border border-white/5 bg-zinc-950/50 p-4 md:block">
            <div className="flex items-center gap-2">
              <BookOpenText className="h-4 w-4 text-[#FF3B30]" />
              <span className="text-sm font-semibold text-white">Study Diary</span>
            </div>
            <div className="space-y-2 pt-4">
              {['Today', 'Tasks', 'Courses', 'Focus Timer'].map((item, i) => (
                <div
                  key={item}
                  className={`rounded-lg px-3 py-2 text-xs ${
                    i === 0 ? 'bg-[#FF3B30]/20 text-[#FF3B30]' : 'text-zinc-500'
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Main content mockup */}
          <div className="space-y-4 md:col-span-2">
            {/* Greeting */}
            <div className="rounded-xl border border-[#FF3B30]/10 bg-gradient-to-br from-zinc-900 to-zinc-900/50 p-5">
              <p className="text-xs text-zinc-500">WEDNESDAY, MARCH 12</p>
              <p className="mt-1 text-lg font-bold text-white">
                Good morning, <span className="text-[#FF3B30]">Ahmed</span>.
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Your next move is Kirchhoff&apos;s Laws in Physics.
              </p>
              <div className="mt-3 flex gap-2">
                <div className="rounded-lg bg-[#FF3B30] px-3 py-1.5 text-xs font-semibold text-white">
                  Start Next
                </div>
                <div className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-300">
                  Focus 25m
                </div>
              </div>
            </div>

            {/* Metrics row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Focus', value: '87%', color: '#FF3B30', icon: Target },
                { label: 'Progress', value: '60%', color: '#10B981', icon: TrendingUp },
                { label: 'Streak', value: '12', color: '#F59E0B', icon: Flame },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl border border-white/5 bg-zinc-900/50 p-3"
                >
                  <div className="flex items-center gap-1.5">
                    <metric.icon className="h-3 w-3" style={{ color: metric.color }} />
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wider"
                      style={{ color: metric.color }}
                    >
                      {metric.label}
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-bold text-white">{metric.value}</p>
                </div>
              ))}
            </div>

            {/* Tasks */}
            <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-4">
              <p className="text-xs font-semibold text-zinc-400">TODAY&apos;S MISSION</p>
              <div className="mt-3 space-y-2">
                {[
                  { name: "Kirchhoff's Laws", subject: 'Physics', done: false },
                  { name: 'Quadratic Equations', subject: 'Math', done: true },
                  { name: 'Periodic Table Trends', subject: 'Chemistry', done: true },
                ].map((task) => (
                  <div key={task.name} className="flex items-center gap-3 rounded-lg px-2 py-1.5">
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-full ${
                        task.done ? 'bg-emerald-500/20' : 'border border-zinc-600'
                      }`}
                    >
                      {task.done && <Check className="h-3 w-3 text-emerald-400" />}
                    </div>
                    <span
                      className={`text-xs ${
                        task.done ? 'text-zinc-500 line-through' : 'text-white'
                      }`}
                    >
                      {task.name}
                    </span>
                    <span className="ml-auto text-[10px] text-zinc-600">{task.subject}</span>
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

// ============================================
// MAIN LANDING PAGE COMPONENT
// ============================================
export function LandingPage({ onGetStarted }: { onGetStarted: () => void }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ];

  const handleNavClick = (href: string) => {
    setMobileMenuOpen(false);
    const el = document.querySelector(href);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* ============================================
          1. NAVBAR
          ============================================ */}
      <motion.nav
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
          scrolled ? 'border-b border-white/5 bg-black/70 backdrop-blur-xl' : 'bg-transparent'
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <BookOpenText className="h-7 w-7 text-[#FF3B30]" />
            <span className="text-lg font-bold tracking-tight">Study Diary</span>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <button
                key={link.href}
                onClick={() => handleNavClick(link.href)}
                className="text-sm font-medium text-zinc-400 transition-colors hover:text-white"
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:block">
            <button
              onClick={onGetStarted}
              className="rounded-xl bg-[#FF3B30] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-[#E0342B] hover:shadow-lg hover:shadow-[#FF3B30]/25 active:scale-95"
            >
              Get Started Free
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-400 transition-colors hover:bg-white/5 hover:text-white md:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden border-t border-white/5 bg-black/95 backdrop-blur-xl md:hidden"
            >
              <div className="space-y-1 px-4 py-4">
                {navLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => handleNavClick(link.href)}
                    className="block w-full rounded-xl px-4 py-3 text-left text-sm font-medium text-zinc-300 transition-colors hover:bg-white/5 hover:text-white"
                  >
                    {link.label}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onGetStarted();
                  }}
                  className="mt-2 w-full rounded-xl bg-[#FF3B30] px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-[#E0342B]"
                >
                  Get Started Free
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* ============================================
          2. HERO SECTION
          ============================================ */}
      <section className="relative overflow-hidden pb-20 pt-28 sm:pt-32 md:pb-28 md:pt-36">
        {/* Background glow effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#FF3B30]/8 blur-[120px]" />
          <div className="absolute top-40 right-0 h-[400px] w-[400px] rounded-full bg-purple-600/5 blur-[100px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            {/* Left: Copy */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-sm"
              >
                <Sparkles className="h-3.5 w-3.5 text-[#FF3B30]" />
                <span className="text-xs font-medium text-zinc-300">Track · Pace · Complete</span>
              </motion.div>

              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
                Stop Cramming.{' '}
                <span className="bg-gradient-to-r from-[#FF3B30] to-[#FF6B60] bg-clip-text text-transparent">
                  Start Tracking.
                </span>
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-zinc-400 sm:text-xl">
                The smartest study planner for FBISE board exam prep. Get a personalized daily
                plan, track every topic, and build unstoppable momentum — from Chapter 1 to exam
                day.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <button
                  onClick={onGetStarted}
                  className="group flex items-center gap-2 rounded-xl bg-[#FF3B30] px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#FF3B30]/25 transition-all hover:bg-[#E0342B] hover:shadow-xl hover:shadow-[#FF3B30]/30 active:scale-95"
                >
                  Start Free
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <button
                  onClick={() => handleNavClick('#how-it-works')}
                  className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-7 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/10 active:scale-95"
                >
                  See How It Works
                </button>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-zinc-500">
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>No credit card</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>FBISE aligned</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-emerald-500" />
                  <span>Works offline</span>
                </div>
              </div>
            </motion.div>

            {/* Right: Hero Image with floating cards */}
            <FloatingCards />
          </div>
        </div>
      </section>

      {/* ============================================
          3. PROBLEM SECTION
          ============================================ */}
      <section className="scroll-mt-20 bg-zinc-950 py-20 sm:py-28" id="problem">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-red-500/20 bg-red-500/5 px-4 py-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-400">
                The Problem
              </span>
            </div>
            <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">
              Board prep shouldn&apos;t feel like wandering in the dark.
            </h2>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="mt-12 grid gap-6 md:grid-cols-3"
          >
            {[
              {
                num: '01',
                text: '389 topics, zero visibility on where you stand',
                sub: "You don't know what you've covered and what's left. It's overwhelming.",
              },
              {
                num: '02',
                text: "Watching random YouTube videos isn't a study plan",
                sub: 'Hours of screen time, no structured progress. Sound familiar?',
              },
              {
                num: '03',
                text: 'You start strong, lose track by week 2',
                sub: 'Without a system, motivation fades. You need accountability, not just willpower.',
              },
            ].map((item) => (
              <motion.div
                key={item.num}
                variants={staggerItem}
                className="group relative overflow-hidden rounded-2xl border border-red-500/10 bg-gradient-to-b from-red-950/20 to-zinc-950 p-7 transition-all hover:border-red-500/20"
              >
                <div className="pointer-events-none absolute -top-6 -right-6 h-24 w-24 rounded-full bg-red-500/5 blur-2xl transition-all group-hover:bg-red-500/10" />
                <span className="text-3xl font-black text-red-500/30">{item.num}</span>
                <h3 className="mt-3 text-lg font-bold text-white">{item.text}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-500">{item.sub}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================
          4. FEATURES SECTION
          ============================================ */}
      <section className="scroll-mt-20 py-20 sm:py-28" id="features">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
              <Zap className="h-3.5 w-3.5 text-[#FF3B30]" />
              <span className="text-xs font-medium text-zinc-300">Features</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              Everything you need to{' '}
              <span className="bg-gradient-to-r from-[#FF3B30] to-[#FF6B60] bg-clip-text text-transparent">
                ace your boards
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
              Six powerful tools designed specifically for Pakistani students preparing for FBISE
              exams.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[
              {
                icon: CalendarCheck,
                title: 'Smart Daily Planner',
                desc: 'Auto-schedules topics based on your pace and goals. No more deciding what to study — just follow the plan.',
                color: '#FF3B30',
              },
              {
                icon: Play,
                title: 'Video + Notes',
                desc: 'Every topic has curated YouTube lectures and PDF notes. No more searching — everything is organized for you.',
                color: '#3B82F6',
              },
              {
                icon: Timer,
                title: 'Focus Timer',
                desc: 'Built-in Pomodoro timer with 25-minute sessions. Stay laser-focused and track your study hours.',
                color: '#F59E0B',
              },
              {
                icon: BarChart3,
                title: 'Progress Tracking',
                desc: 'Focus score, streaks, and real-time metrics. See exactly where you stand across all subjects.',
                color: '#10B981',
              },
              {
                icon: WifiOff,
                title: 'Offline First',
                desc: "Works without internet. Study on the bus, in the library, anywhere. Syncs when you're back online.",
                color: '#8B5CF6',
              },
              {
                icon: GraduationCap,
                title: 'Board Aligned',
                desc: 'FBISE curriculum for grades 9-12, all groups — Science, Arts, Commerce. Plus major BISE boards.',
                color: '#EC4899',
              },
            ].map((feature) => (
              <motion.div
                key={feature.title}
                variants={staggerItem}
                className="group relative overflow-hidden rounded-2xl border border-white/5 bg-zinc-900/50 p-7 transition-all hover:border-white/10 hover:bg-zinc-900/80"
              >
                {/* Glow */}
                <div
                  className="pointer-events-none absolute -top-8 -left-8 h-32 w-32 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                  style={{ backgroundColor: `${feature.color}15` }}
                />
                <div
                  className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${feature.color}15` }}
                >
                  <feature.icon className="h-6 w-6" style={{ color: feature.color }} />
                </div>
                <h3 className="text-lg font-bold text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{feature.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================
          5. HOW IT WORKS
          ============================================ */}
      <section
        className="scroll-mt-20 border-y border-white/5 bg-zinc-950/50 py-20 sm:py-28"
        id="how-it-works"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
              <Rocket className="h-3.5 w-3.5 text-[#FF3B30]" />
              <span className="text-xs font-medium text-zinc-300">How It Works</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              Three steps to exam readiness
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
              From sign-up to study streak — it takes less than 2 minutes.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="mt-16 grid gap-8 md:grid-cols-3"
          >
            {[
              {
                step: '1',
                title: 'Sign Up',
                desc: 'Enter your grade, board (FBISE, BISE Lahore, etc.), and field — Science, Arts, or Commerce.',
                icon: Users,
              },
              {
                step: '2',
                title: 'Get Your Plan',
                desc: 'An auto-generated daily study schedule appears, customized to your pacing goal — 3, 5, or 6 months.',
                icon: CalendarCheck,
              },
              {
                step: '3',
                title: 'Track & Complete',
                desc: 'Watch lectures, mark topics done, build your streak, and watch your focus score climb every day.',
                icon: Flame,
              },
            ].map((item) => (
              <motion.div key={item.step} variants={staggerItem} className="group relative text-center">
                {/* Connector line (desktop) */}
                {item.step !== '3' && (
                  <div className="absolute top-12 right-0 hidden h-px w-1/2 bg-gradient-to-r from-white/10 to-transparent md:block" />
                )}
                {item.step !== '1' && (
                  <div className="absolute top-12 left-0 hidden h-px w-1/2 bg-gradient-to-l from-white/10 to-transparent md:block" />
                )}

                <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-2xl border border-white/10 bg-zinc-900 backdrop-blur-sm transition-all group-hover:border-[#FF3B30]/30 group-hover:bg-[#FF3B30]/5">
                  <item.icon className="h-10 w-10 text-[#FF3B30]" />
                </div>

                <div className="mb-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#FF3B30]/10 text-sm font-bold text-[#FF3B30]">
                  {item.step}
                </div>

                <h3 className="text-xl font-bold text-white">{item.title}</h3>
                <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-zinc-400">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================
          6. DASHBOARD PREVIEW
          ============================================ */}
      <section className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
              <Star className="h-3.5 w-3.5 text-[#FF3B30]" />
              <span className="text-xs font-medium text-zinc-300">App Preview</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              Your study command center
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-zinc-400">
              See everything at a glance — your daily plan, focus metrics, streak, and progress
              across every subject.
            </p>
          </motion.div>

          <div className="mt-12">
            <DashboardMockup />
          </div>

          {/* Highlighted metrics */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="mt-12 grid gap-4 sm:grid-cols-3"
          >
            {[
              {
                icon: Target,
                label: 'Focus Score',
                desc: 'Daily completion percentage across all your scheduled tasks',
                color: '#FF3B30',
              },
              {
                icon: TrendingUp,
                label: 'Progress Tracking',
                desc: 'Real-time view of completed topics vs total across every subject',
                color: '#10B981',
              },
              {
                icon: Flame,
                label: 'Streak Counter',
                desc: 'Gamified daily streaks to keep you motivated and consistent',
                color: '#F59E0B',
              },
            ].map((item) => (
              <motion.div
                key={item.label}
                variants={staggerItem}
                className="rounded-2xl border border-white/5 bg-zinc-900/50 p-6 text-center"
              >
                <div
                  className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl"
                  style={{ backgroundColor: `${item.color}15` }}
                >
                  <item.icon className="h-6 w-6" style={{ color: item.color }} />
                </div>
                <h3 className="text-lg font-bold text-white">{item.label}</h3>
                <p className="mt-2 text-sm text-zinc-400">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================
          7. PRICING SECTION
          ============================================ */}
      <section className="scroll-mt-20 py-20 sm:py-28" id="pricing">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
              <Crown className="h-3.5 w-3.5 text-[#FF3B30]" />
              <span className="text-xs font-medium text-zinc-300">Pricing</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              Start free, go premium when ready
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-zinc-400">
              Basic access is always free. Upgrade to unlock every topic, video, and feature.
            </p>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="mx-auto mt-16 grid max-w-4xl gap-6 lg:grid-cols-2"
          >
            {/* Free Plan */}
            <motion.div
              variants={fadeInScale}
              className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 p-8"
            >
              <h3 className="text-xl font-bold text-white">Free</h3>
              <p className="mt-2 text-sm text-zinc-400">Get started with essential features</p>
              <div className="mt-6">
                <span className="text-4xl font-extrabold text-white">
                  $0
                </span>
                <span className="text-zinc-500">/forever</span>
              </div>
              <ul className="mt-8 space-y-4">
                {[
                  'Basic topic access',
                  'Limited video lectures',
                  'Limited PDF notes',
                  'Progress tracking',
                  'Focus timer',
                  '1 board plan',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                    <Check className="h-4 w-4 flex-shrink-0 text-zinc-500" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={onGetStarted}
                className="mt-8 w-full rounded-xl border border-white/10 bg-white/5 py-3.5 text-sm font-semibold text-white transition-all hover:bg-white/10 active:scale-[0.98]"
              >
                Get Started Free
              </button>
            </motion.div>

            {/* Premium Plan */}
            <motion.div
              variants={fadeInScale}
              className="relative overflow-hidden rounded-2xl border border-[#FF3B30]/20 bg-gradient-to-b from-[#FF3B30]/5 to-zinc-900/50 p-8"
            >
              {/* Popular badge */}
              <div className="absolute top-4 right-4 rounded-full bg-[#FF3B30] px-3 py-1 text-xs font-bold text-white">
                Popular
              </div>

              <h3 className="text-xl font-bold text-white">Premium</h3>
              <p className="mt-2 text-sm text-zinc-400">Unlock everything for your exam prep</p>
              <div className="mt-6">
                <span className="text-4xl font-extrabold text-white">
                  $15
                </span>
                <span className="text-zinc-500">/full year</span>
              </div>
              <ul className="mt-8 space-y-4">
                {[
                  'All 389+ topics unlocked',
                  'Unlimited video lectures',
                  'Unlimited PDF notes',
                  'Advanced progress analytics',
                  'Focus timer + sessions',
                  'All board plans',
                  'Priority support',
                  'Offline downloads',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                    <Check className="h-4 w-4 flex-shrink-0 text-[#FF3B30]" />
                    {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={onGetStarted}
                className="mt-8 w-full rounded-xl bg-[#FF3B30] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#FF3B30]/25 transition-all hover:bg-[#E0342B] hover:shadow-xl hover:shadow-[#FF3B30]/30 active:scale-[0.98]"
              >
                Upgrade to Premium
              </button>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ============================================
          8. FAQ SECTION
          ============================================ */}
      <section className="scroll-mt-20 border-t border-white/5 bg-zinc-950/50 py-20 sm:py-28" id="faq">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-[#FF3B30]" />
              <span className="text-xs font-medium text-zinc-300">FAQ</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              Frequently asked questions
            </h2>
          </motion.div>

          <motion.div
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
            className="mt-12"
          >
            {[
              {
                q: 'Is Study Diary really free?',
                a: 'Yes! The free plan gives you access to basic topics, progress tracking, and the focus timer forever. No credit card required. Upgrade to Premium only when you need full access to all videos and notes.',
              },
              {
                q: 'Which boards and grades are supported?',
                a: 'We support FBISE (Federal Board) and major BISE boards for grades 9-12, covering Science, Arts, and Commerce groups. More boards are being added regularly.',
              },
              {
                q: 'Does it work without internet?',
                a: 'Absolutely. Study Diary is designed to work offline. Your progress is saved locally and syncs automatically when you reconnect. Study anywhere — on the bus, in the library, or at home.',
              },
              {
                q: 'How does the daily planner work?',
                a: 'When you sign up, you choose a pacing goal (3, 5, or 6 months). The planner auto-generates a daily schedule that distributes all topics across your timeline. Just follow the plan — no more guessing what to study.',
              },
              {
                q: 'What does Premium include?',
                a: 'Premium unlocks all 389+ topics with full video lectures, PDF notes, advanced analytics, offline downloads, and priority support. Free users get limited access to videos and notes.',
              },
              {
                q: 'Can I use it on my phone?',
                a: 'Yes! Study Diary is a Progressive Web App (PWA). You can install it on any phone — Android or iPhone — directly from the browser. It works just like a native app with offline support.',
              },
            ].map((item) => (
              <FAQItem key={item.q} question={item.q} answer={item.a} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ============================================
          9. FINAL CTA SECTION
          ============================================ */}
      <section className="relative overflow-hidden py-20 sm:py-28">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-1/2 left-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#FF3B30]/10 blur-[120px]" />
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <motion.div
            variants={sectionVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-100px' }}
          >
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#FF3B30]/20 bg-[#FF3B30]/5 px-4 py-1.5">
              <Rocket className="h-3.5 w-3.5 text-[#FF3B30]" />
              <span className="text-xs font-semibold text-[#FF3B30]">Start Today</span>
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">
              Your board exam success{' '}
              <span className="bg-gradient-to-r from-[#FF3B30] to-[#FF6B60] bg-clip-text text-transparent">
                starts here
              </span>
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-400">
              Join 500+ students who stopped cramming and started tracking. Your personalized
              study plan is 2 minutes away.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                onClick={onGetStarted}
                className="group flex items-center gap-2 rounded-xl bg-[#FF3B30] px-8 py-4 text-base font-semibold text-white shadow-lg shadow-[#FF3B30]/25 transition-all hover:bg-[#E0342B] hover:shadow-xl hover:shadow-[#FF3B30]/30 active:scale-95"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
            <p className="mt-4 text-sm text-zinc-600">No credit card · Free forever plan · 2 min setup</p>
          </motion.div>
        </div>
      </section>

      {/* ============================================
          10. FOOTER
          ============================================ */}
      <footer className="border-t border-white/5 bg-zinc-950 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2.5">
                <BookOpenText className="h-6 w-6 text-[#FF3B30]" />
                <span className="text-lg font-bold">Study Diary</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-zinc-500">
                The smartest study planner for Pakistani students. Track your curriculum, build
                streaks, and ace your board exams.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-white">Product</h4>
              <ul className="mt-4 space-y-3">
                {['Features', 'Pricing', 'How It Works', 'FAQ'].map((item) => (
                  <li key={item}>
                    <button
                      onClick={() => {
                        const href =
                          item === 'Features'
                            ? '#features'
                            : item === 'Pricing'
                              ? '#pricing'
                              : item === 'How It Works'
                                ? '#how-it-works'
                                : '#faq';
                        handleNavClick(href);
                      }}
                      className="text-sm text-zinc-500 transition-colors hover:text-white"
                    >
                      {item}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Boards */}
            <div>
              <h4 className="text-sm font-semibold text-white">Boards</h4>
              <ul className="mt-4 space-y-3">
                {['FBISE Islamabad', 'BISE Lahore', 'BISE Karachi', 'BISE Rawalpindi'].map(
                  (item) => (
                    <li key={item}>
                      <span className="text-sm text-zinc-500">{item}</span>
                    </li>
                  )
                )}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-sm font-semibold text-white">Support</h4>
              <ul className="mt-4 space-y-3">
                {['Contact Us', 'Privacy Policy', 'Terms of Service', 'Help Center'].map(
                  (item) => (
                    <li key={item}>
                      <span className="text-sm text-zinc-500">{item}</span>
                    </li>
                  )
                )}
              </ul>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 sm:flex-row">
            <p className="text-sm text-zinc-600">
              &copy; {new Date().getFullYear()} Study Diary. Built for Pakistani students.
            </p>
            <div className="flex items-center gap-1 text-sm text-zinc-600">
              Made with <Heart className="h-3.5 w-3.5 fill-[#FF3B30] text-[#FF3B30]" /> in Pakistan
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
