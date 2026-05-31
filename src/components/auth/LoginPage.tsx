'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Phone, Lock, Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export function LoginPage() {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginStage, setLoginStage] = useState<'idle' | 'verifying' | 'signing_in' | 'loading_dashboard'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const cleanPhone = phone.trim();
      const cleanPin = pin.trim();

      if (!cleanPhone || !cleanPin) {
        setError('Please enter both phone number and PIN');
        setIsLoading(false);
        return;
      }

      // Step 1: Verify credentials against live Google Sheet
      setLoginStage('verifying');
      console.log(`🔑 Step 1: Verifying credentials for phone="${cleanPhone}"`);

      const verifyRes = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, pin: cleanPin }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        console.warn('🔑 Verification failed:', verifyData.error);
        setError(verifyData.error || 'Invalid credentials');
        setIsLoading(false);
        setLoginStage('idle');
        return;
      }

      console.log('🔑 Step 1: Credentials verified for', verifyData.user.name);

      // Step 2: Create NextAuth session
      setLoginStage('signing_in');
      console.log('🔑 Step 2: Creating NextAuth session...');

      const result = await signIn('credentials', {
        phone: cleanPhone,
        pin: cleanPin,
        redirect: false,
      });

      console.log('🔑 Step 2: NextAuth result:', JSON.stringify(result));

      if (result?.error) {
        // NextAuth signIn failed even though our API verified the credentials
        // This shouldn't happen, but handle it gracefully
        console.error('🔑 NextAuth signIn error after verified credentials:', result.error);
        
        // Try once more - sometimes there's a CSRF timing issue
        console.log('🔑 Retrying NextAuth signIn...');
        const retryResult = await signIn('credentials', {
          phone: cleanPhone,
          pin: cleanPin,
          redirect: false,
        });
        
        if (retryResult?.error) {
          setError('Session creation failed. Please refresh the page and try again.');
          setIsLoading(false);
          setLoginStage('idle');
          return;
        }
      }

      // Step 3: Load dashboard
      setLoginStage('loading_dashboard');
      console.log('🔑 Step 3: Redirecting to dashboard...');

      // Hard reload to ensure session is properly initialized
      window.location.href = '/';
    } catch (err) {
      console.error('🔑 Login error:', err);
      setError('Connection error. Please check your internet and try again.');
      setIsLoading(false);
      setLoginStage('idle');
    }
  };

  const getLoadingText = () => {
    switch (loginStage) {
      case 'verifying': return 'Verifying credentials...';
      case 'signing_in': return 'Creating session...';
      case 'loading_dashboard': return 'Loading dashboard...';
      default: return 'Signing in...';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Background ambient effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/3 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/2 rounded-full blur-[160px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo & Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4"
          >
            <Zap className="w-8 h-8 text-primary" />
          </motion.div>
          <h1 className="font-display text-3xl font-bold tracking-tight">LectureDiary</h1>
          <p className="text-sm text-muted-foreground font-mono mt-1.5">
            Your Study OS · Sign in to continue
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="glass-strong rounded-2xl p-6 sm:p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Phone Field */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground tracking-wider uppercase">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setError(''); }}
                  placeholder="03XXXXXXXXX"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary/50 border border-border text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all"
                  autoComplete="tel"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* PIN Field */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground tracking-wider uppercase">
                PIN
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setError(''); }}
                  placeholder="••••"
                  maxLength={6}
                  className="w-full pl-10 pr-12 py-3 rounded-xl bg-secondary/50 border border-border text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/40 transition-all tracking-[0.3em]"
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -5, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -5, height: 0 }}
                  className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20"
                >
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                  <p className="text-xs text-destructive font-medium">{error}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading || !phone || !pin}
              whileHover={!isLoading ? { scale: 1.01 } : undefined}
              whileTap={!isLoading ? { scale: 0.98 } : undefined}
              className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{getLoadingText()}</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Live status indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-5 flex items-center justify-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-muted-foreground font-mono">
            Live synced with Google Sheets
          </span>
        </motion.div>
      </motion.div>
    </div>
  );
}
