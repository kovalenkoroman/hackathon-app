import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Sessions.module.css';
import localStyles from './ChangePassword.module.css';

export default function DeleteAccount({ user }) {
  const navigate = useNavigate();
  const [confirmText, setConfirmText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const expectedPhrase = user?.username || 'delete my account';
  const canDelete = confirmText.trim() === expectedPhrase && !loading;

  const handleDelete = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/v1/auth/account', { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        window.location.href = '/login';
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete account');
      }
    } catch (err) {
      setError('Failed to delete account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Delete account</h1>
        <p className={styles.pageSubtitle}>This action is permanent and cannot be undone.</p>
      </header>

      <section className={`${styles.section} ${styles.dangerSection}`}>
        <h2 className={styles.dangerTitle}>What gets deleted</h2>
        <ul className={styles.dangerList}>
          <li>Your account and all personal data</li>
          <li>All rooms you own — including every message and uploaded file inside them</li>
          <li>Your membership in all other rooms</li>
          <li>Your friendships, blocks, and direct message dialogs</li>
          <li>All of your active sessions on every device</li>
        </ul>

        {error && <div className={localStyles.error}>{error}</div>}

        <form onSubmit={handleDelete} className={localStyles.form}>
          <div className={localStyles.field}>
            <label htmlFor="confirmText">
              Type <strong>{expectedPhrase}</strong> to confirm
            </label>
            <input
              id="confirmText"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={loading}
              autoComplete="off"
              placeholder={expectedPhrase}
            />
          </div>

          <div className={localStyles.actions}>
            <button
              type="button"
              onClick={() => navigate('/sessions')}
              className={styles.secondaryBtn}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canDelete}
              className={styles.dangerBtn}
            >
              {loading ? 'Deleting…' : 'Delete account permanently'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
