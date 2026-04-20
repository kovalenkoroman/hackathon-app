import { useState } from 'react';
import { Link } from 'react-router-dom';
import * as authApi from '../api/auth';
import styles from './Auth.module.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      await authApi.resetPassword(email);
      setMessage('If an account exists, a password reset link will be sent to your email.');
      setEmail('');
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
        <h1 className={styles.cardTitle}>Reset your password</h1>
        <p className={styles.cardSubtitle}>We'll send a reset link to your email.</p>

        {error && <div className={styles.error}>{error}</div>}
        {message && <div className={styles.success}>{message}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              placeholder="you@example.com"
              required
            />
          </div>
          <button type="submit" disabled={loading} className={styles.primaryBtn}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <div className={styles.footer}>
          Remembered it? <Link to="/login" className={styles.inlineLink}>Back to sign in</Link>
        </div>
      </div>
    </div>
  );
}
