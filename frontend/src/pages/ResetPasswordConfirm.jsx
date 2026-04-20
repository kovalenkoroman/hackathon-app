import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import * as authApi from '../api/auth';
import styles from './Auth.module.css';

export default function ResetPasswordConfirm() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!token) {
    return (
      <div className={styles.page}>
        <Link to="/" className={styles.brand}>
          <img src="/logo.svg" alt="" className={styles.brandLogo} />
          <span className={styles.brandName}>Hackathon Chat</span>
        </Link>
        <div className={styles.card}>
          <h1 className={styles.cardTitle}>Reset password</h1>
          <div className={styles.error}>Invalid or missing reset token.</div>
          <div className={styles.footer}>
            <Link to="/forgot-password" className={styles.inlineLink}>Request a new reset link</Link>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authApi.confirmPasswordReset(token, newPassword);
      setSuccess('Password reset successfully. Redirecting to sign in…');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => (window.location.href = '/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.brand}>
        <img src="/logo.svg" alt="" className={styles.brandLogo} />
        <span className={styles.brandName}>Hackathon Chat</span>
      </Link>

      <div className={styles.card}>
        <h1 className={styles.cardTitle}>Set a new password</h1>
        <p className={styles.cardSubtitle}>Choose something you haven't used before.</p>

        {error && <div className={styles.error}>{error}</div>}
        {success && <div className={styles.success}>{success}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              placeholder="At least 6 characters"
              required
            />
          </div>
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              placeholder="••••••••"
              required
            />
          </div>
          <button type="submit" disabled={loading || !token} className={styles.primaryBtn}>
            {loading ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <div className={styles.footer}>
          <Link to="/login" className={styles.inlineLink}>Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
