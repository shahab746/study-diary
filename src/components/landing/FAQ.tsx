'use client';

import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    q: 'What classes are supported?',
    a: 'Study Diary currently supports 9th, 10th, 11th, and 12th grade students of the Federal Board (FBISE). We cover Science, Pre-Medical, Pre-Engineering, and Computer Science fields.',
  },
  {
    q: 'Is this only for FBISE students?',
    a: 'Yes, Study Diary is specifically designed for FBISE (Federal Board of Intermediate and Secondary Education) students. The syllabus, notes, and video lectures are all aligned with the FBISE curriculum.',
  },
  {
    q: 'Can I use it on mobile?',
    a: 'Absolutely! Study Diary is mobile-first and works beautifully on any device — smartphones, tablets, laptops, and desktops. Just open it in your browser, no app download needed.',
  },
  {
    q: 'How much does premium cost?',
    a: 'Premium access is just ₨499/month. This gives you full access to all video lectures, PDF notes, complete syllabus tracking, exam resources, and priority support.',
  },
  {
    q: 'Do I get notes and videos?',
    a: 'Yes! Every topic in the syllabus has curated video lectures from YouTube and downloadable PDF notes. Free users get access to selected free topics, while Premium users get everything.',
  },
  {
    q: 'What if I start late in the year?',
    a: 'No problem! Study Diary adjusts your daily plan based on your pacing goal (3, 5, or 6 months) and current progress. Even if you start 2 months before exams, the app creates a focused plan to help you cover the most important topics first.',
  },
];

export default function FAQ() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="py-24 sm:py-32 bg-gray-50 dark:bg-gray-900" ref={ref}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-sm font-semibold text-red-500 uppercase tracking-widest">FAQ</span>
          <h2 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-white">
            Frequently asked questions
          </h2>
        </motion.div>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="text-base font-semibold text-gray-900 dark:text-white pr-4">{faq.q}</span>
                <motion.div
                  animate={{ rotate: openIndex === i ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-shrink-0"
                >
                  <ChevronDown width={20} height={20} className="text-gray-400" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <div className="px-5 pb-5 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
