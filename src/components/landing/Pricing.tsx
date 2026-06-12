'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { Check, X, Sparkles } from 'lucide-react';
import { useLoginModal } from './LandingPage';

const plans = [
  {
    name: 'Free',
    price: '₨0',
    period: 'forever',
    desc: 'Get started with essential study tools.',
    features: [
      { text: 'Chapter 1 Access', included: true },
      { text: 'Selected Videos', included: true },
      { text: 'Basic Progress Tracking', included: true },
      { text: 'All Video Lectures', included: false },
      { text: 'All PDF Notes', included: false },
      { text: 'Full Syllabus Access', included: false },
      { text: 'Priority Support', included: false },
      { text: 'Exam Resources', included: false },
    ],
    cta: 'Start Free',
    highlighted: false,
  },
  {
    name: 'Premium',
    price: '₨499',
    period: '/month',
    desc: 'Unlock everything you need to ace your exams.',
    features: [
      { text: 'Complete Syllabus', included: true },
      { text: 'All Video Lectures', included: true },
      { text: 'All PDF Notes', included: true },
      { text: 'Full Progress Tracking', included: true },
      { text: 'Priority Support', included: true },
      { text: 'Exam Resources', included: true },
      { text: 'Goal-Based Planning', included: true },
      { text: 'Focus Timer', included: true },
    ],
    cta: 'Get Premium',
    highlighted: true,
  },
];

export default function Pricing() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const { openLogin } = useLoginModal();

  return (
    <section id="pricing" className="py-24 sm:py-32 bg-white dark:bg-gray-950" ref={ref}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="text-sm font-semibold text-red-500 uppercase tracking-widest">Pricing</span>
          <h2 className="mt-3 text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Start free. Upgrade when you&apos;re ready to unlock everything.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.2, duration: 0.6 }}
              className={`relative p-8 rounded-3xl transition-all duration-300 ${
                plan.highlighted
                  ? 'bg-gradient-to-b from-gray-900 to-gray-950 text-white shadow-2xl shadow-red-500/10 ring-2 ring-red-500/50 scale-[1.02]'
                  : 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 hover:border-red-200 dark:hover:border-red-500/30'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-red-500 to-amber-500 text-white text-xs font-bold rounded-full shadow-lg shadow-red-500/30">
                    <Sparkles width={12} height={12} /> MOST POPULAR
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className={`text-lg font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                  {plan.name}
                </h3>
                <p className={`text-sm mt-1 ${plan.highlighted ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400'}`}>
                  {plan.desc}
                </p>
              </div>

              <div className="flex items-baseline gap-1 mb-8">
                <span className={`text-4xl sm:text-5xl font-extrabold ${plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                  {plan.price}
                </span>
                <span className={`text-sm ${plan.highlighted ? 'text-gray-500' : 'text-gray-500 dark:text-gray-400'}`}>
                  {plan.period}
                </span>
              </div>

              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-center gap-3">
                    {f.included ? (
                      <Check width={16} height={16} className={plan.highlighted ? 'text-green-400' : 'text-green-500'} />
                    ) : (
                      <X width={16} height={16} className="text-gray-400 dark:text-gray-600" />
                    )}
                    <span className={`text-sm ${f.included ? (plan.highlighted ? 'text-gray-200' : 'text-gray-700 dark:text-gray-300') : 'text-gray-400 dark:text-gray-600 line-through'}`}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              <button
                onClick={openLogin}
                className={`block w-full py-3.5 text-center font-semibold rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] ${
                  plan.highlighted
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40'
                    : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:bg-gray-800 dark:hover:bg-gray-100'
                }`}
              >
                {plan.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
