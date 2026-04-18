import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Friends.module.css';

export default function Friends({ user }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('list'); // 'list', 'pending', 'find'
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tab === 'list') {
      fetchFriends();
    } else if (tab === 'pending') {
      fetchPendingRequests();
    }
  }, [tab]);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/friends');
      const json = await res.json();
      setFriends(json.data || []);
    } catch (err) {
      setError('Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/friends/requests/pending');
      const json = await res.json();
      setPending(json.data || []);
    } catch (err) {
      setError('Failed to load pending requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    try {
      const res = await fetch('/api/v1/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput })
      });

      if (res.ok) {
        setUsernameInput('');
        setError('');
        setTab('list'); // Switch to friends list
      } else {
        const json = await res.json();
        setError(json.error || 'Failed to send request');
      }
    } catch (err) {
      setError('Error sending friend request');
    }
  };

  const handleAccept = async (id) => {
    try {
      const res = await fetch(`/api/v1/friends/requests/${id}/accept`, {
        method: 'POST'
      });

      if (res.ok) {
        setPending((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      setError('Failed to accept request');
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await fetch(`/api/v1/friends/requests/${id}/reject`, {
        method: 'POST'
      });

      if (res.ok) {
        setPending((prev) => prev.filter((p) => p.id !== id));
      }
    } catch (err) {
      setError('Failed to reject request');
    }
  };

  const handleRemove = async (id) => {
    if (!confirm('Remove this friend?')) return;

    try {
      const res = await fetch(`/api/v1/friends/${id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setFriends((prev) => prev.filter((f) => f.id !== id));
      }
    } catch (err) {
      setError('Failed to remove friend');
    }
  };

  const handleMessage = (friendId) => {
    navigate(`/dm/${friendId}`);
  };

  return (
    <div className={styles.container}>
      <h1>Friends</h1>

      <div className={styles.tabs}>
        <button
          className={tab === 'list' ? styles.active : ''}
          onClick={() => setTab('list')}
        >
          Friends List
        </button>
        <button
          className={tab === 'pending' ? styles.active : ''}
          onClick={() => setTab('pending')}
        >
          Pending Requests
        </button>
        <button
          className={tab === 'find' ? styles.active : ''}
          onClick={() => setTab('find')}
        >
          Find Users
        </button>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {tab === 'list' && (
        <div className={styles.section}>
          <h2>Your Friends</h2>
          {loading ? (
            <p>Loading...</p>
          ) : friends.length === 0 ? (
            <p>No friends yet. Send a friend request!</p>
          ) : (
            <div className={styles.list}>
              {friends.map((friend) => (
                <div key={friend.id} className={styles.card}>
                  <div className={styles.info}>
                    <strong>{friend.username}</strong>
                    <span className={styles.email}>{friend.email}</span>
                  </div>
                  <div className={styles.actions}>
                    <button onClick={() => handleMessage(friend.id)} className={styles.primary}>
                      Message
                    </button>
                    <button onClick={() => handleRemove(friend.id)} className={styles.secondary}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'pending' && (
        <div className={styles.section}>
          <h2>Pending Requests</h2>
          {loading ? (
            <p>Loading...</p>
          ) : pending.length === 0 ? (
            <p>No pending requests.</p>
          ) : (
            <div className={styles.list}>
              {pending.map((req) => (
                <div key={req.id} className={styles.card}>
                  <div className={styles.info}>
                    <strong>{req.username}</strong>
                    <span className={styles.email}>{req.email}</span>
                  </div>
                  <div className={styles.actions}>
                    <button onClick={() => handleAccept(req.id)} className={styles.primary}>
                      Accept
                    </button>
                    <button onClick={() => handleReject(req.id)} className={styles.secondary}>
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'find' && (
        <div className={styles.section}>
          <h2>Send Friend Request</h2>
          <form onSubmit={handleSendRequest} className={styles.form}>
            <input
              type="text"
              placeholder="Enter username"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
            />
            <button type="submit" className={styles.primary}>
              Send Request
            </button>
          </form>
        </div>
      )}

      <div className={styles.back}>
        <a href="/">← Back to home</a>
      </div>
    </div>
  );
}
