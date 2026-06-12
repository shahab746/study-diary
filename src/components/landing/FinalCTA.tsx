'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useLoginModal } from './LandingPage';

export default function FinalCTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const { openLogin } = useLoginModal();

  return (
    <section className="py-24 sm:py-32 relative overflow-hidden" ref={ref}>
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-500 to-amber-500" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:64px_64px]" />
      
      {/* Gradient orbs */}
      <div className="absolute top-10 right-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
      <div className="absolute bottom-10 left-10 w-72 h-72 bg-amber-500/20 rounded-full blur-3xl" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-8">
            <Sparkles width={14} height={14} className="text-amber-300" />
            <span className="text-sm font-medium text-white/90">Start your journey today</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-extrabold text-white leading-tight">
            One Year From Now,{' '}
            <br className="hidden sm:block" />
            You&apos;ll Wish You{' '}
            <span className="underline decoration-amber-300 decoration-4 underline-offset-4">
              Started Today.
            </span>
          </h2>

          <p className="mt-6 text-lg sm:text-xl text-white/80 max-w-2xl mx-auto">
            Join thousands of students building smarter study habits with Study Diary.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={openLogin}
              className="group inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-red-600 bg-white rounded-2xl shadow-xl shadow-black/10 hover:shadow-black/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Start Free
              <ArrowRight width={18} height={18} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
            <a
              href="#pricing"
              className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white bg-white/10 rounded-2xl border border-white/20 hover:bg-white/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Get Premium
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
