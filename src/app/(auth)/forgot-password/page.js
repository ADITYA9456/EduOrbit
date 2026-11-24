'use client';

import { useAuth } from '@/context/AuthProvider';
import Link from 'next/link';
import AuthField from '@/components/auth/AuthField';
import GlassPanel from '@/components/ui/GlassPanel';
import { useRef, useState } from 'react';
import { HiMail } from 'react-icons/hi';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setFieldError('');
    const value = email.trim();
    if (!value) {
      setFieldError('Enter your email address');
      emailRef.current?.focus();
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setFieldError('Enter a valid email address');
      emailRef.current?.focus();
      return;
    }
    setLoading(true);
    try {
      await resetPassword(value);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Could not send the reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <GlassPanel className="auth-card" padded={false}>
        <div className="auth-card__header">
          <h1 className="auth-card__title">Reset your password</h1>
          <p className="auth-card__subtitle">We&apos;ll email you a link to choose a new one</p>
        </div>

        {error && <div className="form-error" role="alert" id="auth-error">{error}</div>}

        {sent ? (
          <div className="form-success" role="status">
            If an account exists for {email.trim()}, a reset link is on its way. Check your inbox and spam folder.
          </div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <AuthField
              id="forgot-email" label="Email" icon={HiMail} ref={emailRef}
              type="email" autoComplete="email" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              required error={fieldError} formErrorId="auth-error"
            />
            <button type="submit" className="btn btn--primary btn--lg" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        <div className="auth-card__footer">
          <Link href="/login">Back to sign in</Link>
        </div>
      </GlassPanel>
    </div>
  );
}
