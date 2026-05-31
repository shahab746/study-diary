'use client';

import { useState } from 'react';
import { signIn, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Phone, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

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
      console.log('🔑 Step 2: Creating session for', cleanPhone);

      localStorage.removeItem('study-os-storage');

      // Step 3: Create NextAuth session for the new user
      console.log('🔑 Step 3: Creating NextAuth session for', cleanPhone);

      const result = await signIn('credentials', {
        phone: cleanPhone,
        pin: cleanPin,
        redirect: false,
      });

      console.log('🔑 Step 3: NextAuth result:', JSON.stringify(result));

      if (result?.error) {
        console.error('🔑 NextAuth signIn error:', result.error);
        setError('Session creation failed. Please refresh the page and try again.');
        setIsLoading(false);
        setLoginStage('idle');
        return;
      }

      // Step 4: Wait for session to be established, then reload
      setLoginStage('loading_dashboard');
      console.log('🔑 Step 4: Session created, waiting for dashboard...');

      // Small delay to ensure session cookie is set, then soft reload
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.reload();
    } catch (err) {
      console.error('🔑 Login error:', err);
      setError('Connection error. Please check your internet and try again.');
      setIsLoading(false);
      setLoginStage('idle');
    }
  };

  const getLoadingText = () => {
    switch (loginStage) {
      case 'verifying': return 'Verifying credentials';
      case 'signing_in': return 'Signing in';
      case 'loading_dashboard': return 'Loading dashboard';
      default: return 'Signing in';
    }
  };

  const getLoadingStep = () => {
    switch (loginStage) {
      case 'verifying': return 1;
      case 'signing_in': return 2;
      case 'loading_dashboard': return 3;
      default: return 0;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Animated floating orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -40, 20, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 -left-20 w-72 h-72 bg-primary/8 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            x: [0, -25, 30, 0],
            y: [0, 30, -30, 0],
            scale: [1, 0.9, 1.15, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-1/4 -right-20 w-80 h-80 bg-amber-500/6 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, 20, -30, 0],
            y: [0, -20, 30, 0],
            scale: [1, 1.05, 0.95, 1],
          }}
          transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/4 rounded-full blur-[160px]"
        />
        <motion.div
          animate={{
            x: [0, -15, 25, 0],
            y: [0, 35, -15, 0],
            scale: [1, 1.08, 0.92, 1],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-3/4 left-1/3 w-64 h-64 bg-orange-400/5 rounded-full blur-[100px]"
        />
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
            className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4 relative"
          >
            <Zap className="w-8 h-8 text-primary" />
            {/* Subtle glow around logo */}
            <div className="absolute inset-0 rounded-2xl bg-primary/10 blur-xl" />
          </motion.div>
          <h1 className="font-display text-3xl font-bold tracking-tight">LectureDiary</h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="text-sm text-primary/80 font-display font-semibold tracking-widest mt-2"
          >
            Track. Pace. Complete.
          </motion.p>
          <p className="text-xs text-muted-foreground font-mono mt-1.5">
            Your Study OS · Sign in to continue
          </p>
        </motion.div>

        {/* Login Card with animated gradient border */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative rounded-[1.15rem] p-[1px] overflow-hidden"
        >
          {/* Rotating gradient border */}
          <div className="login-card-border-glow" />
          <div className="absolute inset-[1px] rounded-[1.1rem] bg-card" />

          <div className="relative rounded-[1.1rem] p-6 sm:p-8 glass-strong">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Phone Field */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground tracking-wider uppercase flex items-center gap-1.5">
                  Phone Number
                  {phone && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      <CheckCircle2 className="w-3 h-3 text-primary/60" />
                    </motion.span>
                  )}
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => { setPhone(e.target.value); setError(''); }}
                    placeholder="03XXXXXXXXX"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary/50 border border-border text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:shadow-[0_0_20px_oklch(0.795_0.184_86.047/10%)] transition-all"
                    autoComplete="tel"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* PIN Field */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground tracking-wider uppercase flex items-center gap-1.5">
                  PIN
                  {pin && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 500, damping: 25 }}
                    >
                      <CheckCircle2 className="w-3 h-3 text-primary/60" />
                    </motion.span>
                  )}
                </label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => { setPin(e.target.value); setError(''); }}
                    placeholder="••••"
                    maxLength={6}
                    className="w-full pl-10 pr-12 py-3 rounded-xl bg-secondary/50 border border-border text-sm font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:shadow-[0_0_20px_oklch(0.795_0.184_86.047/10%)] transition-all tracking-[0.3em]"
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

              {/* Submit Button with shimmer */}
              <div className="relative overflow-hidden rounded-xl">
                <motion.button
                  type="submit"
                  disabled={isLoading || !phone || !pin}
                  whileHover={!isLoading ? { scale: 1.01 } : undefined}
                  whileTap={!isLoading ? { scale: 0.98 } : undefined}
                  className="w-full py-3.5 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      {/* Animated loading dots */}
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ y: [0, -6, 0] }}
                            transition={{
                              duration: 0.6,
                              repeat: Infinity,
                              delay: i * 0.15,
                              ease: 'easeInOut',
                            }}
                            className="w-1.5 h-1.5 rounded-full bg-primary-foreground"
                          />
                        ))}
                      </div>
                      <span>{getLoadingText()}</span>
                    </div>
                  ) : (
                    <>
                      <span>Sign in</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </motion.button>

                {/* Shimmer sweep effect */}
                {!isLoading && phone && pin && (
                  <motion.div
                    className="absolute inset-0 pointer-events-none"
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: 'easeInOut' }}
                  >
                    <div className="w-1/3 h-full bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-[-20deg]" />
                  </motion.div>
                )}
              </div>

              {/* Loading progress steps */}
              <AnimatePresence>
                {isLoading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-1.5"
                  >
                    {/* Step progress bar */}
                    <div className="flex gap-1.5">
                      {['verifying', 'signing_in', 'loading_dashboard'].map((stage, i) => (
                        <div
                          key={stage}
                          className="h-1 flex-1 rounded-full overflow-hidden bg-secondary"
                        >
                          <motion.div
                            className="h-full bg-primary rounded-full"
                            initial={{ width: '0%' }}
                            animate={{
                              width: getLoadingStep() > i ? '100%' : getLoadingStep() === i ? '60%' : '0%',
                            }}
                            transition={{ duration: 0.4, ease: 'easeOut' }}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between">
                      {['Verify', 'Sign in', 'Load'].map((label, i) => (
                        <span
                          key={label}
                          className={`text-[9px] font-mono transition-colors ${
                            getLoadingStep() > i
                              ? 'text-primary'
                              : getLoadingStep() === i
                                ? 'text-muted-foreground'
                                : 'text-muted-foreground/40'
                          }`}
                        >
                          {label}
                        </span>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
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
