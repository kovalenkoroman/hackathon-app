import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as authApi from '../api/auth';
import styles from './Sessions.module.css';
import localStyles from './ChangePassword.module.css';

export default function ChangePassword() {
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [signOutOthers, setSignOutOthers] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from current password');
      return;
    }

    setLoading(true);
    try {
      await authApi.changePassword(currentPassword, newPassword);

      if (signOutOthers) {
        try {
          await fetch('/api/v1/auth/sessions', { method: 'DELETE', credentials: 'include' });
        } catch (err) {
          /* non-fatal */
        }
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess(
        signOutOthers
          ? 'Password changed. Other devices have been signed out.'
          : 'Password changed successfully.'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputType = showPasswords ? 'text' : 'password';

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Change password</h1>
        <p className={styles.pageSubtitle}>Update the password you use to sign in.</p>
      </header>

      <section className={styles.section}>
        {error && <div className={localStyles.error}>{error}</div>}
        {success && <div className={localStyles.success}>{success}</div>}

        <form onSubmit={handleSubmit} className={localStyles.form}>
          <div className={localStyles.field}>
            <label htmlFor="currentPassword">Current password</label>
            <input
              id="currentPassword"
              type={inputType}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
            <Link to="/forgot-password" className={localStyles.inlineLink}>
              Forgot your current password?
            </Link>
          </div>

          <div className={localStyles.field}>
            <label htmlFor="newPassword">New password</label>
            <input
              id="newPassword"
              type={inputType}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              placeholder="At least 6 characters"
              required
            />
          </div>

          <div className={localStyles.field}>
            <label htmlFor="confirmPassword">Confirm new password</label>
            <input
              id="confirmPassword"
              type={inputType}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              placeholder="••••••••"
              required
            />
          </div>

          <label className={localStyles.checkboxRow}>
            <input
              type="checkbox"
              checked={showPasswords}
              onChange={(e) => setShowPasswords(e.target.checked)}
              disabled={loading}
            />
            <span>Show passwords</span>
          </label>

          <label className={localStyles.checkboxRow}>
            <input
              type="checkbox"
              checked={signOutOthers}
              onChange={(e) => setSignOutOthers(e.target.checked)}
              disabled={loading}
            />
            <span>Sign out of other devices</span>
          </label>

          <div className={localStyles.actions}>
            <button
              type="button"
              onClick={() => navigate('/sessions')}
              className={styles.secondaryBtn}
              disabled={loading}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading} className={styles.primaryBtn}>
              {loading ? 'Changing…' : 'Change password'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
