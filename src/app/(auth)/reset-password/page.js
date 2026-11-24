'use client';

import { useAuth } from '@/context/AuthProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AuthField from '@/components/auth/AuthField';
import GlassPanel from '@/components/ui/GlassPanel';
import { useRef, useState } from 'react';
import { HiLockClosed } from 'react-icons/hi';

export default function ResetPasswordPage() {
  const { user, loading: authLoading, updatePassword } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const refs = { password: useRef(null), confirm: useRef(null) };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    const errors = {};
    if (password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (confirm !== password) errors.confirm = 'Passwords do not match';
    setFieldErrors(errors);
    const first = Object.keys(errors)[0];
    if (first) return refs[first].current?.focus();

    setLoading(true);
    try {
      await updatePassword(password);
      setDone(true);
      setTimeout(() => router.push('/home'), 1500);
    } catch (err) {
      setError(err.message || 'Could not update your password. Request a new reset link and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <GlassPanel className="auth-card" padded={false}>
        <div className="auth-card__header">
          <h1 className="auth-card__title">Choose a new password</h1>
        </div>

        {error && <div className="form-error" role="alert" id="auth-error">{error}</div>}

        {authLoading ? (
          <p className="auth-card__subtitle" role="status">Checking your reset link...</p>
        ) : !user ? (
          <div className="form-error" role="alert">
            This reset link is invalid or has expired. <Link href="/forgot-password">Request a new one</Link>.
          </div>
        ) : done ? (
          <div className="form-success" role="status">Password updated. Taking you to your dashboard...</div>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            <AuthField
              id="reset-password" label="New password" icon={HiLockClosed} ref={refs.password}
              type="password" autoComplete="new-password" placeholder="At least 8 characters"
              value={password} onChange={(e) => setPassword(e.target.value)}
              required error={fieldErrors.password} formErrorId="auth-error"
            />
            <AuthField
              id="reset-confirm" label="Confirm password" icon={HiLockClosed} ref={refs.confirm}
              type="password" autoComplete="new-password" placeholder="Repeat password"
              value={confirm} onChange={(e) => setConfirm(e.target.value)}
              required error={fieldErrors.confirm} formErrorId="auth-error"
            />
            <button type="submit" className="btn btn--primary btn--lg" disabled={loading} style={{ width: '100%' }}>
              {loading ? 'Saving...' : 'Update password'}
            </button>
          </form>
        )}
      </GlassPanel>
    </div>
  );
}
