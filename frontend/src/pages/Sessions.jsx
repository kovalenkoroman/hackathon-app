import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './Sessions.module.css';

function formatRelative(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - date) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

function parseAgent(ua) {
  if (!ua) return { device: 'Unknown device', icon: '💻' };
  const lower = ua.toLowerCase();
  let device = 'Browser';
  let icon = '💻';
  if (lower.includes('iphone') || lower.includes('ipad')) { device = 'iOS device'; icon = '📱'; }
  else if (lower.includes('android')) { device = 'Android device'; icon = '📱'; }
  else if (lower.includes('mac')) { device = 'Mac'; icon = '🖥️'; }
  else if (lower.includes('windows')) { device = 'Windows'; icon = '🖥️'; }
  else if (lower.includes('linux')) { device = 'Linux'; icon = '🖥️'; }

  let browser = '';
  if (lower.includes('chrome') && !lower.includes('edg')) browser = 'Chrome';
  else if (lower.includes('safari') && !lower.includes('chrome')) browser = 'Safari';
  else if (lower.includes('firefox')) browser = 'Firefox';
  else if (lower.includes('edg')) browser = 'Edge';

  return { device: browser ? `${browser} on ${device}` : device, icon };
}

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/v1/auth/sessions');
      const json = await response.json();
      setSessions(json.data || []);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRevoke = async (sessionId) => {
    try {
      await fetch(`/api/v1/auth/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to revoke session:', error);
    }
  };

  const handleLogoutOthers = async () => {
    if (!confirm('This will sign you out of all other devices. Continue?')) return;
    try {
      await fetch('/api/v1/auth/sessions', { method: 'DELETE' });
      await fetchSessions();
    } catch (error) {
      console.error('Failed to sign out other sessions:', error);
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This cannot be undone. All rooms you own will be deleted along with their messages and files.')) return;
    if (!window.confirm('This is your final warning. Delete account?')) return;
    try {
      const response = await fetch('/api/v1/auth/account', { method: 'DELETE' });
      if (response.ok) {
        window.location.href = '/login';
      } else {
        const data = await response.json();
        alert('Failed to delete account: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Failed to delete account:', error);
      alert('Failed to delete account');
    }
  };

  if (loading) {
    return <div className={styles.container}><p className={styles.mutedNote}>Loading…</p></div>;
  }

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Account settings</h1>
        <p className={styles.pageSubtitle}>Manage your security, devices, and account.</p>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Password</h2>
        <p className={styles.sectionDesc}>Update the password you use to sign in.</p>
        <Link to="/change-password" className={styles.primaryBtn}>
          Change password
        </Link>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeaderRow}>
          <div>
            <h2 className={styles.sectionTitle}>Active sessions</h2>
            <p className={styles.sectionDesc}>
              {sessions.length} active {sessions.length === 1 ? 'session' : 'sessions'}.
            </p>
          </div>
          {sessions.length > 1 && (
            <button onClick={handleLogoutOthers} className={styles.secondaryBtn}>
              Sign out everywhere else
            </button>
          )}
        </div>

        <div className={styles.sessionList}>
          {sessions.map((session) => {
            const { device, icon } = parseAgent(session.userAgent);
            const isCurrent = session.isCurrent;
            return (
              <div
                key={session.id}
                className={`${styles.sessionCard} ${isCurrent ? styles.current : ''}`}
              >
                <div className={styles.sessionIcon}>{icon}</div>
                <div className={styles.sessionInfo}>
                  <div className={styles.sessionTop}>
                    <strong className={styles.sessionDevice}>{device}</strong>
                    {isCurrent && <span className={styles.currentBadge}>This device</span>}
                  </div>
                  <div className={styles.sessionMeta}>
                    <span>{session.ip || 'Unknown IP'}</span>
                    <span className={styles.dot}>•</span>
                    <span>Active {formatRelative(session.lastSeen)}</span>
                    <span className={styles.dot}>•</span>
                    <span>Signed in {new Date(session.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                {!isCurrent && (
                  <button
                    onClick={() => handleRevoke(session.id)}
                    className={styles.revokeBtn}
                  >
                    Revoke
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className={`${styles.section} ${styles.dangerSection}`}>
        <h2 className={styles.dangerTitle}>Danger zone</h2>
        <p className={styles.sectionDesc}>Deleting your account is permanent.</p>
        <ul className={styles.dangerList}>
          <li>All your personal data will be removed</li>
          <li>All rooms you own (with their messages and files) will be deleted</li>
          <li>You will be removed from all rooms you've joined</li>
        </ul>
        <button onClick={handleDeleteAccount} className={styles.dangerBtn}>
          Delete account
        </button>
      </section>
    </div>
  );
}
