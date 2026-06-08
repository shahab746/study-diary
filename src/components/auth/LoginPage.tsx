'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import {
  BookOpenText, Phone, Lock, Eye, EyeOff, ArrowRight, AlertCircle,
  CheckCircle2, UserPlus, LogIn, ChevronDown, GraduationCap, School
} from 'lucide-react';

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════
type AuthMode = 'login' | 'register';

interface SelectOption {
  value: string;
  label: string;
}

const GRADE_OPTIONS: SelectOption[] = [
  { value: '9', label: 'Grade 9' },
  { value: '10', label: 'Grade 10' },
  { value: '11', label: 'Grade 11' },
  { value: '12', label: 'Grade 12' },
];

const BOARD_OPTIONS: SelectOption[] = [
  { value: 'BISE Abbottabad', label: 'BISE Abbottabad' },
  { value: 'FBISE', label: 'FBISE' },
  { value: 'BISE Lahore', label: 'BISE Lahore' },
  { value: 'BISE Karachi', label: 'BISE Karachi' },
  { value: 'BISE Rawalpindi', label: 'BISE Rawalpindi' },
  { value: 'BISE Peshawar', label: 'BISE Peshawar' },
  { value: 'Other', label: 'Other' },
];

const FIELD_OPTIONS: SelectOption[] = [
  { value: 'Science', label: 'Science' },
  { value: 'Arts', label: 'Arts' },
  { value: 'Commerce', label: 'Commerce' },
  { value: 'General', label: 'General' },
];

const ACADEMIC_GROUP_OPTIONS: SelectOption[] = [
  { value: 'Pre-Medical', label: 'Pre-Medical' },
  { value: 'Pre-Engineering', label: 'Pre-Engineering' },
  { value: 'ICS', label: 'ICS (Computer Science)' },
  { value: 'General', label: 'General' },
];

// ═══════════════════════════════════════════════
// Shared Styles
// ═══════════════════════════════════════════════
const inputStyle: React.CSSProperties = {
  width: '100%', paddingLeft: 42, paddingRight: 16, paddingTop: 12, paddingBottom: 12,
  borderRadius: 12, border: '1px solid var(--border)',
  background: 'var(--surface)',
  backdropFilter: 'blur(12px)',
  fontSize: 14, fontFamily: 'var(--font-jetbrains-mono), monospace',
  color: 'var(--text-primary)',
  outline: 'none', transition: 'all .2s',
};

const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
  color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em',
  fontWeight: 600, marginBottom: 8,
};

const selectStyle: React.CSSProperties = {
  width: '100%', paddingLeft: 42, paddingRight: 36, paddingTop: 12, paddingBottom: 12,
  borderRadius: 12, border: '1px solid var(--border)',
  background: 'var(--surface)',
  backdropFilter: 'blur(12px)',
  fontSize: 14, fontFamily: 'var(--font-jetbrains-mono), monospace',
  color: 'var(--text-primary)',
  outline: 'none', transition: 'all .2s',
  appearance: 'none',
  cursor: 'pointer',
};

const iconInInputStyle: React.CSSProperties = {
  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
  color: 'var(--text-muted)',
};

const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = 'var(--accent)';
  e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-soft)';
};
const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
  e.currentTarget.style.borderColor = 'var(--border)';
  e.currentTarget.style.boxShadow = 'none';
};

// ═══════════════════════════════════════════════
// Login Form Component
// ═══════════════════════════════════════════════
function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loginStage, setLoginStage] = useState<'idle' | 'verifying' | 'loading_dashboard'>('idle');

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

      // Verify credentials first via our custom endpoint
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

      // Credentials verified — now sign in via NextAuth
      setLoginStage('loading_dashboard');
      const result = await signIn('credentials', {
        phone: cleanPhone,
        pin: cleanPin,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error || 'Sign in failed. Please try again.');
        setIsLoading(false);
        setLoginStage('idle');
        return;
      }

      // Clear old state and reload
      localStorage.removeItem('study-os-storage');
      window.location.reload();
    } catch {
      setError('Connection error. Please check your internet and try again.');
      setIsLoading(false);
      setLoginStage('idle');
    }
  };

  const getLoadingText = () => {
    switch (loginStage) {
      case 'verifying': return 'Verifying credentials';
      case 'loading_dashboard': return 'Loading dashboard';
      default: return 'Signing in';
    }
  };

  const getLoadingStep = () => {
    switch (loginStage) {
      case 'verifying': return 1;
      case 'loading_dashboard': return 3;
      default: return 0;
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Phone Field */}
      <div>
        <label style={labelStyle}>
          Phone Number
          {phone && <CheckCircle2 width={12} height={12} style={{ color: 'var(--accent-light)' }} />}
        </label>
        <div style={{ position: 'relative' }}>
          <div style={iconInInputStyle}><Phone width={16} height={16} /></div>
          <input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setError(''); }}
            placeholder="03XXXXXXXXX"
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoComplete="tel"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      {/* PIN Field */}
      <div>
        <label style={labelStyle}>
          PIN
          {pin && <CheckCircle2 width={12} height={12} style={{ color: 'var(--accent-light)' }} />}
        </label>
        <div style={{ position: 'relative' }}>
          <div style={iconInInputStyle}><Lock width={16} height={16} /></div>
          <input
            type={showPin ? 'text' : 'password'}
            value={pin}
            onChange={(e) => { setPin(e.target.value); setError(''); }}
            placeholder="••••"
            maxLength={6}
            style={{ ...inputStyle, paddingRight: 48, letterSpacing: '.3em' }}
            onFocus={handleFocus}
            onBlur={handleBlur}
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
            <LogIn width={16} height={16} />
            <span>Sign in</span>
            <ArrowRight width={16} height={16} />
          </>
        )}
      </button>

      {/* Loading progress */}
      {isLoading && (
        <div>
          <div style={{ display: 'flex', gap: 6 }}>
            {['verifying', 'loading_dashboard'].map((stage, i) => (
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
                  width: getLoadingStep() > i ? '100%' : '0%',
                  transition: 'width .4s ease-out',
                }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            {['Verify', 'Load'].map((label, i) => (
              <span key={label} style={{
                fontSize: 10, fontFamily: 'var(--font-jetbrains-mono), monospace',
                color: getLoadingStep() > i ? 'var(--accent-light)' : 'var(--text-muted)',
                fontWeight: getLoadingStep() > i ? 600 : 400,
                transition: 'all .3s',
              }}>
                {label}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Switch to Register */}
      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Don&apos;t have an account?{' '}
        </span>
        <button
          type="button"
          onClick={onSwitchToRegister}
          style={{
            background: 'none', border: 'none', color: 'var(--accent-light)',
            cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            textDecoration: 'underline', textUnderlineOffset: 3,
          }}
        >
          Create one
        </button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════
// Register Form Component
// ═══════════════════════════════════════════════
function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [grade, setGrade] = useState('10');
  const [board, setBoard] = useState('BISE Abbottabad');
  const [field, setField] = useState('Science');
  const [academicGroup, setAcademicGroup] = useState('Pre-Medical');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!name.trim() || name.trim().length < 2) {
      setError('Please enter your full name (at least 2 characters).');
      return;
    }
    if (!/^\d{11}$/.test(phone.trim())) {
      setError('Phone number must be exactly 11 digits (e.g., 03XXXXXXXXX).');
      return;
    }
    if (!/^\d{4,6}$/.test(pin.trim())) {
      setError('PIN must be 4-6 digits.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          pin: pin.trim(),
          confirmPin: confirmPin.trim(),
          grade: Number(grade),
          board,
          field,
          academicGroup,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Registration failed. Please try again.');
        setIsLoading(false);
        return;
      }

      console.log('✅ Registration successful:', data.user);
      setSuccess(true);

      // Auto-login after a brief delay
      setTimeout(async () => {
        try {
          const signInResult = await signIn('credentials', {
            phone: phone.trim(),
            pin: pin.trim(),
            redirect: false,
          });

          if (signInResult?.error) {
            // Fallback: switch to login form
            setError('Account created! Please sign in with your credentials.');
            setSuccess(false);
            onSwitchToLogin();
          } else {
            localStorage.removeItem('study-os-storage');
            window.location.reload();
          }
        } catch {
          setError('Account created! Please sign in with your credentials.');
          setSuccess(false);
          onSwitchToLogin();
        }
      }, 1500);
    } catch {
      setError('Connection error. Please check your internet and try again.');
      setIsLoading(false);
    }
  };

  // Validation indicators
  const nameValid = name.trim().length >= 2;
  const phoneValid = /^\d{11}$/.test(phone.trim());
  const pinValid = /^\d{4,6}$/.test(pin.trim());
  const confirmPinValid = confirmPin === pin && pin.length > 0;

  if (success) {
    return (
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{
          width: 56, height: 56, borderRadius: '50%',
          background: 'rgba(34,197,94,0.15)', display: 'grid', placeItems: 'center',
          margin: '0 auto 16px',
        }}>
          <CheckCircle2 width={28} height={28} style={{ color: '#22C55E' }} />
        </div>
        <h3 style={{ color: 'var(--text-primary)', fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
          Account Created!
        </h3>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Signing you in automatically...
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginTop: 16 }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 6, height: 6, borderRadius: '50%', background: 'var(--accent-light)',
              animation: `blink 1.2s infinite`, animationDelay: `${i * 0.15}s`,
            }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Name Field */}
      <div>
        <label style={labelStyle}>
          Full Name
          {nameValid && <CheckCircle2 width={12} height={12} style={{ color: 'var(--accent-light)' }} />}
        </label>
        <div style={{ position: 'relative' }}>
          <div style={iconInInputStyle}><BookOpenText width={16} height={16} /></div>
          <input
            type="text"
            value={name}
            onChange={(e) => { setName(e.target.value); setError(''); }}
            placeholder="Muhammad Ali"
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoComplete="name"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      {/* Phone Field */}
      <div>
        <label style={labelStyle}>
          Phone Number
          {phoneValid && <CheckCircle2 width={12} height={12} style={{ color: 'var(--accent-light)' }} />}
        </label>
        <div style={{ position: 'relative' }}>
          <div style={iconInInputStyle}><Phone width={16} height={16} /></div>
          <input
            type="tel"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); setError(''); }}
            placeholder="03XXXXXXXXX"
            style={inputStyle}
            onFocus={handleFocus}
            onBlur={handleBlur}
            autoComplete="tel"
            required
            disabled={isLoading}
          />
        </div>
      </div>

      {/* PIN + Confirm PIN — side by side on wider screens */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>
            PIN
            {pinValid && <CheckCircle2 width={12} height={12} style={{ color: 'var(--accent-light)' }} />}
          </label>
          <div style={{ position: 'relative' }}>
            <div style={iconInInputStyle}><Lock width={16} height={16} /></div>
            <input
              type={showPin ? 'text' : 'password'}
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(''); }}
              placeholder="••••"
              maxLength={6}
              style={{ ...inputStyle, letterSpacing: '.3em' }}
              onFocus={handleFocus}
              onBlur={handleBlur}
              autoComplete="new-password"
              required
              disabled={isLoading}
            />
          </div>
        </div>
        <div>
          <label style={labelStyle}>
            Confirm PIN
            {confirmPinValid && <CheckCircle2 width={12} height={12} style={{ color: 'var(--accent-light)' }} />}
          </label>
          <div style={{ position: 'relative' }}>
            <div style={iconInInputStyle}><Lock width={16} height={16} /></div>
            <input
              type={showPin ? 'text' : 'password'}
              value={confirmPin}
              onChange={(e) => { setConfirmPin(e.target.value); setError(''); }}
              placeholder="••••"
              maxLength={6}
              style={{ ...inputStyle, letterSpacing: '.3em' }}
              onFocus={handleFocus}
              onBlur={handleBlur}
              autoComplete="new-password"
              required
              disabled={isLoading}
            />
          </div>
        </div>
      </div>

      {/* Show PIN toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: -8 }}>
        <button
          type="button"
          onClick={() => setShowPin(!showPin)}
          style={{
            background: 'none', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: 'inherit',
          }}
        >
          {showPin ? <EyeOff width={14} height={14} /> : <Eye width={14} height={14} />}
          {showPin ? 'Hide' : 'Show'} PIN
        </button>
      </div>

      {/* Grade + Board — side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>
            Grade
          </label>
          <div style={{ position: 'relative' }}>
            <div style={iconInInputStyle}><GraduationCap width={16} height={16} /></div>
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              style={selectStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              disabled={isLoading}
            >
              {GRADE_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', pointerEvents: 'none',
            }}>
              <ChevronDown width={14} height={14} />
            </div>
          </div>
        </div>
        <div>
          <label style={labelStyle}>
            Board
          </label>
          <div style={{ position: 'relative' }}>
            <div style={iconInInputStyle}><School width={16} height={16} /></div>
            <select
              value={board}
              onChange={(e) => setBoard(e.target.value)}
              style={selectStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              disabled={isLoading}
            >
              {BOARD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', pointerEvents: 'none',
            }}>
              <ChevronDown width={14} height={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Field + Academic Group — side by side */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={labelStyle}>
            Field
          </label>
          <div style={{ position: 'relative' }}>
            <div style={iconInInputStyle}><BookOpenText width={16} height={16} /></div>
            <select
              value={field}
              onChange={(e) => setField(e.target.value)}
              style={selectStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              disabled={isLoading}
            >
              {FIELD_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', pointerEvents: 'none',
            }}>
              <ChevronDown width={14} height={14} />
            </div>
          </div>
        </div>
        <div>
          <label style={labelStyle}>
            Group
          </label>
          <div style={{ position: 'relative' }}>
            <div style={iconInInputStyle}><GraduationCap width={16} height={16} /></div>
            <select
              value={academicGroup}
              onChange={(e) => setAcademicGroup(e.target.value)}
              style={selectStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
              disabled={isLoading}
            >
              {ACADEMIC_GROUP_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div style={{
              position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', pointerEvents: 'none',
            }}>
              <ChevronDown width={14} height={14} />
            </div>
          </div>
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
        disabled={isLoading || !nameValid || !phoneValid || !pinValid || !confirmPinValid}
        style={{
          width: '100%', padding: '13px 16px', borderRadius: 12,
          background: isLoading || !nameValid || !phoneValid || !pinValid || !confirmPinValid
            ? 'var(--surface-solid)' : 'var(--gradient)',
          color: isLoading || !nameValid || !phoneValid || !pinValid || !confirmPinValid
            ? 'var(--text-muted)' : '#fff',
          border: isLoading || !nameValid || !phoneValid || !pinValid || !confirmPinValid
            ? '1px solid var(--border)' : 'none',
          fontFamily: 'inherit', fontWeight: 600, fontSize: 14,
          cursor: isLoading || !nameValid || !phoneValid || !pinValid || !confirmPinValid
            ? 'not-allowed' : 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          transition: 'all .25s',
          boxShadow: isLoading || !nameValid || !phoneValid || !pinValid || !confirmPinValid
            ? 'none' : 'var(--shadow-glow)',
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
            <span>Creating account...</span>
          </>
        ) : (
          <>
            <UserPlus width={16} height={16} />
            <span>Create account</span>
          </>
        )}
      </button>

      {/* Switch to Login */}
      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          Already have an account?{' '}
        </span>
        <button
          type="button"
          onClick={onSwitchToLogin}
          style={{
            background: 'none', border: 'none', color: 'var(--accent-light)',
            cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            textDecoration: 'underline', textUnderlineOffset: 3,
          }}
        >
          Sign in
        </button>
      </div>
    </form>
  );
}

// ═══════════════════════════════════════════════
// Main LoginPage Component
// ═══════════════════════════════════════════════
export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>('login');

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
            Study Diary
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
            {mode === 'login'
              ? 'Your Study Companion · Sign in to continue'
              : 'Create your account · Start tracking today'}
          </p>
        </div>

        {/* Login/Register Toggle */}
        <div style={{
          display: 'flex', borderRadius: 12, border: '1px solid var(--border)',
          background: 'var(--surface)', overflow: 'hidden', marginBottom: 24,
        }}>
          <button
            onClick={() => setMode('login')}
            style={{
              flex: 1, padding: '10px 16px', border: 'none',
              background: mode === 'login' ? 'var(--gradient)' : 'transparent',
              color: mode === 'login' ? '#fff' : 'var(--text-muted)',
              fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
              cursor: 'pointer', transition: 'all .25s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <LogIn width={14} height={14} />
            Sign In
          </button>
          <button
            onClick={() => setMode('register')}
            style={{
              flex: 1, padding: '10px 16px', border: 'none',
              background: mode === 'register' ? 'var(--gradient)' : 'transparent',
              color: mode === 'register' ? '#fff' : 'var(--text-muted)',
              fontFamily: 'inherit', fontWeight: 600, fontSize: 13,
              cursor: 'pointer', transition: 'all .25s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
          >
            <UserPlus width={14} height={14} />
            Register
          </button>
        </div>

        {/* Form Content */}
        <div className="login-card-inner">
          {mode === 'login' ? (
            <LoginForm onSwitchToRegister={() => setMode('register')} />
          ) : (
            <RegisterForm onSwitchToLogin={() => setMode('login')} />
          )}
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
