'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { BookOpenText, Phone, Lock, Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

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
      const verifyRes = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, pin: cleanPin }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyData.success) {
        setError(verifyData.error || 'Invalid credentials');
        setIsLoading(false);
        setLoginStage('idle');
        return;
      }

      // Step 2: Create NextAuth session
      setLoginStage('signing_in');
      localStorage.removeItem('study-os-storage');

      const result = await signIn('credentials', {
        phone: cleanPhone,
        pin: cleanPin,
        redirect: false,
      });

      if (result?.error) {
        setError('Session creation failed. Please refresh and try again.');
        setIsLoading(false);
        setLoginStage('idle');
        return;
      }

      // Step 3: Wait for session then reload
      setLoginStage('loading_dashboard');
      await new Promise(resolve => setTimeout(resolve, 500));
      window.location.reload();
    } catch (err) {
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
    <div className="login-page">
      {/* Decorative background orbs */}
      <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '10%', left: '-8%', width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', opacity: 0.7,
        }} />
        <div style={{
          position: 'absolute', bottom: '5%', right: '-8%', width: 450, height: 450, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)', opacity: 0.7,
        }} />
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(124,58,237,0.04) 0%, transparent 60%)', opacity: 0.5,
        }} />
      </div>

      <div className="login-card">
        {/* Logo & Title */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'var(--gradient)',
            display: 'grid', placeItems: 'center', color: '#fff',
            boxShadow: 'var(--shadow-glow)',
            margin: '0 auto 16px',
          }}>
            <BookOpenText width={26} height={26} />
          </div>
          <h1 style={{
            fontSize: 28, letterSpacing: -0.02,
            fontFamily: 'var(--font-plus-jakarta), var(--font-inter), system-ui, sans-serif',
            color: 'var(--text-primary)', fontWeight: 700,
          }}>
            Lecture Diary
          </h1>
          <p style={{
            fontSize: 11, color: 'var(--accent-light)', fontWeight: 600,
            letterSpacing: '.12em', textTransform: 'uppercase', marginTop: 6,
          }}>
            Track · Pace · Complete
          </p>
          <p style={{
            fontSize: 12, color: 'var(--text-muted)', marginTop: 6,
            fontFamily: 'var(--font-jetbrains-mono), monospace',
          }}>
            Your Study Companion · Sign in to continue
          </p>
        </div>

        {/* Login Card */}
        <div className="login-card-inner">
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Phone Field */}
            <div>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em',
                fontWeight: 600, marginBottom: 8,
              }}>
                Phone Number
                {phone && <CheckCircle2 width={12} height={12} style={{ color: 'var(--accent-light)' }} />}
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}>
                  <Phone width={16} height={16} />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => { setPhone(e.target.value); setError(''); }}
                  placeholder="03XXXXXXXXX"
                  style={{
                    width: '100%', paddingLeft: 42, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
                    borderRadius: 12, border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    backdropFilter: 'blur(12px)',
                    fontSize: 14, fontFamily: 'var(--font-jetbrains-mono), monospace',
                    color: 'var(--text-primary)',
                    outline: 'none', transition: 'all .2s',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-soft)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                  autoComplete="tel"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* PIN Field */}
            <div>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
                color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em',
                fontWeight: 600, marginBottom: 8,
              }}>
                PIN
                {pin && <CheckCircle2 width={12} height={12} style={{ color: 'var(--accent-light)' }} />}
              </label>
              <div style={{ position: 'relative' }}>
                <div style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}>
                  <Lock width={16} height={16} />
                </div>
                <input
                  type={showPin ? 'text' : 'password'}
                  value={pin}
                  onChange={(e) => { setPin(e.target.value); setError(''); }}
                  placeholder="••••"
                  maxLength={6}
                  style={{
                    width: '100%', paddingLeft: 42, paddingRight: 48, paddingTop: 12, paddingBottom: 12,
                    borderRadius: 12, border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    backdropFilter: 'blur(12px)',
                    fontSize: 14, fontFamily: 'var(--font-jetbrains-mono), monospace',
                    color: 'var(--text-primary)',
                    outline: 'none', transition: 'all .2s', letterSpacing: '.3em',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-soft)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                  autoComplete="current-password"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  style={{
                    position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', transition: 'color .2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  {showPin ? <EyeOff width={16} height={16} /> : <Eye width={16} height={16} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px',
                borderRadius: 12, background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.15)',
              }}>
                <AlertCircle width={16} height={16} style={{ color: '#F87171', flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: '#F87171', fontWeight: 500 }}>{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !phone || !pin}
              style={{
                width: '100%', padding: '13px 16px', borderRadius: 12,
                background: isLoading || !phone || !pin ? 'var(--surface-solid)' : 'var(--gradient)',
                color: isLoading || !phone || !pin ? 'var(--text-muted)' : '#fff',
                border: isLoading || !phone || !pin ? '1px solid var(--border)' : 'none',
                fontFamily: 'inherit', fontWeight: 600, fontSize: 14,
                cursor: isLoading || !phone || !pin ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'all .25s',
                boxShadow: isLoading || !phone || !pin ? 'none' : 'var(--shadow-glow)',
              }}
              onMouseEnter={e => {
                if (!isLoading && phone && pin) {
                  e.currentTarget.style.boxShadow = '0 0 30px rgba(124,58,237,0.4)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = isLoading || !phone || !pin ? 'none' : 'var(--shadow-glow)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {isLoading ? (
                <>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[0, 1, 2].map(i => (
                      <div key={i} style={{
                        width: 6, height: 6, borderRadius: '50%', background: 'currentColor',
                        animation: `blink 1.2s infinite`, animationDelay: `${i * 0.15}s`,
                      }} />
                    ))}
                  </div>
                  <span>{getLoadingText()}</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight width={16} height={16} />
                </>
              )}
            </button>

            {/* Loading progress */}
            {isLoading && (
              <div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {['verifying', 'signing_in', 'loading_dashboard'].map((stage, i) => (
                    <div key={stage} style={{
                      height: 4, flex: 1, borderRadius: 2, overflow: 'hidden',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                    }}>
                      <div style={{
                        height: '100%',
                        background: 'var(--gradient)',
                        borderRadius: 2,
                        boxShadow: '0 0 8px rgba(124,58,237,0.3)',
                        width: getLoadingStep() > i ? '100%' : getLoadingStep() === i ? '60%' : '0%',
                        transition: 'width .4s ease-out',
                      }} />
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                  {['Verify', 'Sign in', 'Load'].map((label, i) => (
                    <span key={label} style={{
                      fontSize: 10, fontFamily: 'var(--font-jetbrains-mono), monospace',
                      color: getLoadingStep() > i ? 'var(--accent-light)' : getLoadingStep() === i ? 'var(--text-secondary)' : 'var(--text-muted)',
                      fontWeight: getLoadingStep() > i ? 600 : 400,
                      transition: 'all .3s',
                    }}>
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Status */}
        <div style={{
          marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: 'var(--accent-light)', display: 'inline-block',
            boxShadow: '0 0 8px rgba(124,58,237,0.4)',
            animation: 'blink 2s infinite',
          }} />
          <span style={{
            fontSize: 11, color: 'var(--text-muted)',
            fontFamily: 'var(--font-jetbrains-mono), monospace',
          }}>
            Live synced with Google Sheets
          </span>
        </div>
      </div>
    </div>
  );
}
