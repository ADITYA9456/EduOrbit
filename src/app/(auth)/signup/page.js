'use client';

import { useAuth } from '@/context/AuthProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthField from '@/components/auth/AuthField';
import GlassPanel from '@/components/ui/GlassPanel';
import { useRef, useState } from 'react';
import { HiAtSymbol, HiLockClosed, HiMail, HiPhone, HiUser } from 'react-icons/hi';

export default function SignupPage() {
  const { signUp, signInWithGoogle, sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const router = useRouter();

  const [authMethod, setAuthMethod] = useState('email'); // 'email' | 'phone'
  const [form, setForm] = useState({ fullName: '', username: '', email: '', password: '', confirmPassword: '' });
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [flagged, setFlagged] = useState([]);

  const refs = {
    fullName: useRef(null), username: useRef(null), email: useRef(null),
    password: useRef(null), confirmPassword: useRef(null), phone: useRef(null), otp: useRef(null),
  };

  const clearErrors = () => {
    setError('');
    setFieldErrors({});
    setFlagged([]);
  };

  // Show field-level errors and move focus to the first invalid field (in form order).
  const failFields = (errors, order) => {
    setFieldErrors(errors);
    setFlagged([]);
    const first = order.find((name) => errors[name]);
    if (first) refs[first].current?.focus();
  };

  // Show a form-level error, flag the given fields and focus the first one.
  const failForm = (message, names) => {
    setError(message);
    setFlagged(names);
    refs[names[0]].current?.focus();
  };

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const EMAIL_ORDER = ['fullName', 'username', 'email', 'password', 'confirmPassword'];

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    clearErrors();

    const errors = {};
    if (!form.fullName.trim()) errors.fullName = 'Enter your full name';
    if (!form.username.trim()) errors.username = 'Choose a username';
    if (!form.email.trim()) errors.email = 'Enter your email address';
    if (!form.password) errors.password = 'Choose a password';
    else if (form.password.length < 6) errors.password = 'Password must be at least 6 characters';
    if (!form.confirmPassword) errors.confirmPassword = 'Confirm your password';
    else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match';
    if (Object.keys(errors).length) return failFields(errors, EMAIL_ORDER);

    setLoading(true);
    try {
      await signUp(form.email, form.password, {
        fullName: form.fullName,
        username: form.username,
      });
      setSuccess('Account created! Please check your email to confirm your account.');
    } catch (err) {
      failForm(err.message || 'Signup failed', ['email', 'username']);
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    clearErrors();
    setSuccess('');
    if (!phone || phone.length < 10) {
      return failFields({ phone: 'Please enter a valid phone number with country code (e.g. +91...)' }, ['phone']);
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
      return failFields({ otp: 'Please enter the 6-digit OTP' }, ['otp']);
    }
    setLoading(true);
    try {
      await verifyPhoneOtp(phone, otp);
      router.push('/home');
    } catch (err) {
      failForm(err.message || 'Invalid OTP', ['otp']);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    clearErrors();
    try {
      await signInWithGoogle();
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
          <h1 className="auth-card__title">Create Account</h1>
          <p className="auth-card__subtitle">Join the learning revolution</p>
        </div>

        {error && <div className="form-error" role="alert" id="auth-error">{error}</div>}
        {success && <div className="form-success" role="status">{success}</div>}

        {/* Google Sign Up */}
        <button
          type="button"
          className="btn btn--social btn--google"
          onClick={handleGoogleSignup}
        >
          <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          Continue with Google
        </button>

        <div className="auth-divider">
          <span>or sign up with</span>
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

        {/* Email Signup Form */}
        {authMethod === 'email' && (
          <form className="auth-form" onSubmit={handleEmailSignup} noValidate>
            <AuthField
              id="signup-full-name" label="Full Name" icon={HiUser} ref={refs.fullName}
              name="fullName" autoComplete="name" placeholder="John Doe"
              value={form.fullName} onChange={handleChange}
              required error={fieldErrors.fullName} invalid={flagged.includes('fullName')} formErrorId="auth-error"
            />
            <AuthField
              id="signup-username" label="Username" icon={HiAtSymbol} ref={refs.username}
              name="username" autoComplete="username" placeholder="johndoe"
              value={form.username} onChange={handleChange}
              required error={fieldErrors.username} invalid={flagged.includes('username')} formErrorId="auth-error"
            />
            <AuthField
              id="signup-email" label="Email" icon={HiMail} ref={refs.email}
              name="email" type="email" autoComplete="email" placeholder="you@example.com"
              value={form.email} onChange={handleChange}
              required error={fieldErrors.email} invalid={flagged.includes('email')} formErrorId="auth-error"
            />
            <AuthField
              id="signup-password" label="Password" icon={HiLockClosed} ref={refs.password}
              name="password" type="password" autoComplete="new-password" placeholder="••••••••"
              value={form.password} onChange={handleChange}
              required error={fieldErrors.password} invalid={flagged.includes('password')} formErrorId="auth-error"
            />
            <AuthField
              id="signup-confirm-password" label="Confirm Password" icon={HiLockClosed} ref={refs.confirmPassword}
              name="confirmPassword" type="password" autoComplete="new-password" placeholder="••••••••"
              value={form.confirmPassword} onChange={handleChange}
              required error={fieldErrors.confirmPassword} invalid={flagged.includes('confirmPassword')} formErrorId="auth-error"
            />
            <button type="submit" className="btn btn--primary btn--lg" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>
        )}

        {/* Phone Signup Form */}
        {authMethod === 'phone' && (
          <>
            {!otpSent ? (
              <form className="auth-form" onSubmit={handleSendOtp} noValidate>
                <AuthField
                  id="signup-phone" label="Phone Number" icon={HiPhone} ref={refs.phone}
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
                  id="signup-otp" label="Enter OTP" ref={refs.otp} inputClassName="otp-input"
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
                  {loading ? 'Verifying...' : 'Verify & Create Account'}
                </button>
              </form>
            )}
          </>
        )}
        <div className="auth-card__footer">
          Already have an account?{' '}
          <Link href="/login">Sign In</Link>
        </div>
      </GlassPanel>
    </div>
  );
}
