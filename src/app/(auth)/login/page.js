'use client';

import { useAuth } from '@/context/AuthProvider';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { safeRedirectPath } from '@/lib/safe-redirect';
import AuthField from '@/components/auth/AuthField';
import GlassPanel from '@/components/ui/GlassPanel';
import { Suspense, useRef, useState } from 'react';
import { HiLockClosed, HiMail, HiPhone } from 'react-icons/hi';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { signIn, signInWithGoogle, sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = safeRedirectPath(searchParams.get('redirect'), '/home');

  const [authMethod, setAuthMethod] = useState('email'); // 'email' | 'phone'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [flagged, setFlagged] = useState([]);

  const refs = { email: useRef(null), password: useRef(null), phone: useRef(null), otp: useRef(null) };

  const clearErrors = () => {
    setError('');
    setFieldErrors({});
    setFlagged([]);
  };

  // Show field-level errors and move focus to the first invalid field.
  const failFields = (errors) => {
    setFieldErrors(errors);
    setFlagged([]);
    const first = Object.keys(errors)[0];
    if (first) refs[first].current?.focus();
  };

  // Show a form-level error, flag the given fields and focus the first one.
  const failForm = (message, names) => {
    setError(message);
    setFlagged(names);
    refs[names[0]].current?.focus();
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    clearErrors();
    const errors = {};
    if (!email.trim()) errors.email = 'Enter your email address';
    if (!password) errors.password = 'Enter your password';
    if (Object.keys(errors).length) return failFields(errors);
    setLoading(true);
    try {
      await signIn(email, password);
      router.push(next);
    } catch (err) {
      failForm(err.message || 'Invalid email or password', ['email', 'password']);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    clearErrors();
    setSuccess('');
    if (!phone || phone.length < 10) {
      return failFields({ phone: 'Please enter a valid phone number with country code (e.g. +91...)' });
    }
    setLoading(true);
    try {
      await sendPhoneOtp(phone);
      setOtpSent(true);
      setSuccess('OTP sent! Check your phone.');
    } catch (err) {
      failForm(err.message || 'Failed to send OTP', ['phone']);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    clearErrors();
    setSuccess('');
    if (!otp || otp.length !== 6) {
      return failFields({ otp: 'Please enter the 6-digit OTP' });
    }
    setLoading(true);
    try {
      await verifyPhoneOtp(phone, otp);
      router.push(next);
    } catch (err) {
      failForm(err.message || 'Invalid OTP', ['otp']);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    clearErrors();
    try {
      await signInWithGoogle(next);
    } catch (err) {
      setError(err.message || 'Google sign-in failed');
    }
  };

  const switchMethod = (method) => {
    setAuthMethod(method);
    clearErrors();
    setSuccess('');
    if (method === 'phone') setOtpSent(false);
  };
  return (
    <div className="auth-page">
      <GlassPanel className="auth-card" padded={false}>
        <div className="auth-card__header">
          <div className="auth-card__logo"><span className="logo-mark" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" /><ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-25 12 12)" /></svg></span></div>
          <h1 className="auth-card__title">Welcome Back</h1>
          <p className="auth-card__subtitle">Sign in to continue learning</p>
        </div>

        {error && <div className="form-error" role="alert" id="auth-error">{error}</div>}
        {success && <div className="form-success" role="status">{success}</div>}

        {/* Google Sign In */}
        <button
          type="button"
          className="btn btn--social btn--google"
          onClick={handleGoogleLogin}
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continue with Google
        </button>

        <div className="auth-divider">
          <span>or sign in with</span>
        </div>

        {/* Auth Method Tabs */}
        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${authMethod === 'email' ? 'auth-tab--active' : ''}`}
            onClick={() => switchMethod('email')}
          >
            <HiMail size={16} /> Email
          </button>
          <button
            type="button"
            className={`auth-tab ${authMethod === 'phone' ? 'auth-tab--active' : ''}`}
            onClick={() => switchMethod('phone')}
          >
            <HiPhone size={16} /> Phone
          </button>
        </div>

        {/* Email Login Form */}
        {authMethod === 'email' && (
          <form className="auth-form" onSubmit={handleEmailLogin} noValidate>
            <AuthField
              id="login-email" label="Email" icon={HiMail} ref={refs.email}
              type="email" autoComplete="email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              required error={fieldErrors.email} invalid={flagged.includes('email')} formErrorId="auth-error"
            />
            <AuthField
              id="login-password" label="Password" icon={HiLockClosed} ref={refs.password}
              type="password" autoComplete="current-password" placeholder="••••••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required error={fieldErrors.password} invalid={flagged.includes('password')} formErrorId="auth-error"
            />
            <div style={{ textAlign: 'right', marginTop: '-0.25rem' }}>
              <Link href="/forgot-password" className="link-btn">Forgot password?</Link>
            </div>
            <button type="submit" className="btn btn--primary btn--lg" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        )}

        {/* Phone Login Form */}
        {authMethod === 'phone' && (
          <>
            {!otpSent ? (
              <form className="auth-form" onSubmit={handleSendOtp} noValidate>
                <AuthField
                  id="login-phone" label="Phone Number" icon={HiPhone} ref={refs.phone}
                  type="tel" autoComplete="tel" placeholder="+91 9876543210"
                  value={phone} onChange={(e) => setPhone(e.target.value)}
                  required error={fieldErrors.phone} invalid={flagged.includes('phone')} formErrorId="auth-error"
                  hint="Include country code (e.g. +91 for India)"
                />
                <button type="submit" className="btn btn--primary btn--lg" disabled={loading} style={{ width: '100%' }}>
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </form>
            ) : (
              <form className="auth-form" onSubmit={handleVerifyOtp} noValidate>
                <AuthField
                  id="login-otp" label="Enter OTP" ref={refs.otp} inputClassName="otp-input"
                  type="text" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000"
                  value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required autoFocus error={fieldErrors.otp} invalid={flagged.includes('otp')} formErrorId="auth-error"
                  hint={
                    <>
                      Sent to {phone} &middot;{' '}
                      <button type="button" className="link-btn" onClick={() => { setOtpSent(false); setOtp(''); clearErrors(); }}>
                        Change number
                      </button>
                    </>
                  }
                />
                <button type="submit" className="btn btn--primary btn--lg" disabled={loading} style={{ width: '100%' }}>
                  {loading ? 'Verifying...' : 'Verify & Sign In'}
                </button>
              </form>
            )}
          </>
        )}
        <div className="auth-card__footer">
          Don&apos;t have an account?{' '}
          <Link href="/signup">Sign Up</Link>
        </div>
      </GlassPanel>
    </div>
  );
}
