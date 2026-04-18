import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import * as authApi from '../api/auth';

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSessionToken] = useState(() => {
    const cookies = document.cookie.split('; ');
    const tokenCookie = cookies.find((row) => row.startsWith('sessionToken='));
    return tokenCookie ? tokenCookie.split('=')[1] : null;
  });

  useEffect(() => {
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

    fetchSessions();
  }, []);

  const handleRevoke = async (sessionId) => {
    try {
      await fetch(`/api/v1/auth/sessions/${sessionId}`, { method: 'DELETE' });
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (error) {
      console.error('Failed to revoke session:', error);
    }
  };

  const handleLogoutAll = async () => {
    if (confirm('This will sign you out of all sessions. Continue?')) {
      try {
        await fetch('/api/v1/auth/sessions', { method: 'DELETE' });
        window.location.href = '/login';
      } catch (error) {
        console.error('Failed to logout all:', error);
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm('Are you sure you want to delete your account? This cannot be undone. All rooms you own will be deleted along with their messages and files.')) {
      return;
    }
    if (!window.confirm('This is your final warning. Delete account?')) {
      return;
    }
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

  if (loading) return <div style={{ padding: '2rem' }}>Loading sessions...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Account Settings</h1>

      <div style={{ marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #ddd' }}>
        <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Password Management</h2>
        <Link to="/change-password" style={{ display: 'inline-block', marginRight: '1rem', padding: '0.5rem 1rem', backgroundColor: '#0066cc', color: 'white', textDecoration: 'none', borderRadius: '4px' }}>
          Change Password
        </Link>
      </div>

      <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Active Sessions</h2>
      <p>You have {sessions.length} active session(s)</p>

      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #ccc' }}>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>IP Address</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>User Agent</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Created</th>
            <th style={{ textAlign: 'left', padding: '0.5rem' }}>Last Seen</th>
            <th style={{ textAlign: 'center', padding: '0.5rem' }}>Action</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session) => {
            const isCurrent = session.id === currentSessionToken;
            return (
              <tr key={session.id} style={{ borderBottom: '1px solid #eee', backgroundColor: isCurrent ? '#f0f8ff' : 'transparent' }}>
                <td style={{ padding: '0.5rem' }}>{session.ip || 'Unknown'}</td>
                <td style={{ padding: '0.5rem', fontSize: '0.85rem' }}>{session.userAgent?.slice(0, 50) || 'Unknown'}...</td>
                <td style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                  {new Date(session.createdAt).toLocaleDateString()}
                </td>
                <td style={{ padding: '0.5rem', fontSize: '0.85rem' }}>
                  {new Date(session.lastSeen).toLocaleString()}
                </td>
                <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                  {isCurrent ? (
                    <span style={{ color: '#999', fontSize: '0.85rem' }}>Current</span>
                  ) : (
                    <button onClick={() => handleRevoke(session.id)} style={{ padding: '0.25rem 0.75rem' }}>
                      Revoke
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: '2rem' }}>
        <button onClick={handleLogoutAll} style={{ padding: '0.5rem 1rem', backgroundColor: '#ff4444', color: 'white', border: 'none', cursor: 'pointer' }}>
          Logout All Sessions
        </button>
      </div>

      <div style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #ddd' }}>
        <h3 style={{ color: '#d32f2f' }}>Danger Zone</h3>
        <p style={{ color: '#666', fontSize: '0.9rem' }}>
          Delete your account permanently. This will:
          <ul style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
            <li>Remove your account and all personal data</li>
            <li>Delete all rooms you own (including messages and files)</li>
            <li>Remove you from all other rooms</li>
            <li>This action cannot be undone</li>
          </ul>
        </p>
        <button
          onClick={handleDeleteAccount}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: '#d32f2f',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          Delete Account
        </button>
      </div>

      <div style={{ marginTop: '2rem' }}>
        <a href="/" style={{ color: '#0066cc', textDecoration: 'none' }}>← Back to home</a>
      </div>
    </div>
  );
}
