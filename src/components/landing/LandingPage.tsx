'use client';

import { useState, createContext, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import Navbar from './Navbar';
import Hero from './Hero';
import Trust from './Trust';
import Problem from './Problem';
import HowItWorks from './HowItWorks';
import Features from './Features';
import DashboardPreview from './DashboardPreview';
import Statistics from './Statistics';
import Testimonials from './Testimonials';
import ExamCountdown from './ExamCountdown';
import Pricing from './Pricing';
import FAQ from './FAQ';
import FinalCTA from './FinalCTA';
import Footer from './Footer';
import { LoginPage } from '@/components/auth/LoginPage';

// Context so child components can open the login modal
const LoginModalContext = createContext<{
  openLogin: () => void;
}>({ openLogin: () => {} });

export function useLoginModal() {
  return useContext(LoginModalContext);
}

export default function LandingPage() {
  const [showLogin, setShowLogin] = useState(false);

  return (
    <LoginModalContext.Provider value={{ openLogin: () => setShowLogin(true) }}>
      <div className="min-h-screen bg-white dark:bg-gray-950">
        <Navbar />
        <Hero />
        <Trust />
        <Problem />
        <HowItWorks />
        <Features />
        <DashboardPreview />
        <Statistics />
        <Testimonials />
        <ExamCountdown />
        <Pricing />
        <FAQ />
        <FinalCTA />
        <Footer />
      </div>

      {/* Login Modal */}
      <AnimatePresence>
        {showLogin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowLogin(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl"
            >
              <button
                onClick={() => setShowLogin(false)}
                className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
              >
                <X width={16} height={16} />
              </button>
              <LoginPage />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </LoginModalContext.Provider>
  );
}
