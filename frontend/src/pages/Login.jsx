import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import * as authApi from '../api/auth';
import styles from './Auth.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [keepSignedIn, setKeepSignedIn] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.login(email, password);
      if (keepSignedIn) {
        localStorage.setItem('keepMeSignedIn', 'true');
        localStorage.setItem('userEmail', email);
      } else {
        localStorage.removeItem('keepMeSignedIn');
        localStorage.removeItem('userEmail');
      }
      navigate('/');
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
        <h1 className={styles.cardTitle}>Welcome back</h1>
        <p className={styles.cardSubtitle}>Sign in to continue to your chat.</p>

        {error && <div className={styles.error}>{error}</div>}

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
          <div className={styles.formGroup}>
            <div className={styles.labelRow}>
              <label htmlFor="password">Password</label>
              <Link to="/forgot-password" className={styles.inlineLink}>Forgot?</Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              placeholder="••••••••"
              required
            />
          </div>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={keepSignedIn}
              onChange={(e) => setKeepSignedIn(e.target.checked)}
              disabled={loading}
            />
            <span>Keep me signed in</span>
          </label>
          <button type="submit" disabled={loading} className={styles.primaryBtn}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className={styles.footer}>
          Don't have an account? <Link to="/register" className={styles.inlineLink}>Create one</Link>
        </div>
      </div>
    </div>
  );
}
