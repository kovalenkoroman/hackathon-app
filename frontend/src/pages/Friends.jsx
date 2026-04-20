import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Inbox, UserX } from 'lucide-react';
import styles from './Friends.module.css';

const TABS = [
  { key: 'list', label: 'Friends' },
  { key: 'pending', label: 'Pending' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'find', label: 'Add friend' },
];

export default function Friends({ user }) {
  const navigate = useNavigate();
  const [tab, setTab] = useState('list');
  const [friends, setFriends] = useState([]);
  const [pending, setPending] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [usernameInput, setUsernameInput] = useState('');
  const [requestMessage, setRequestMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    setError('');
    setSuccessMsg('');
    if (tab === 'list') fetchFriends();
    else if (tab === 'pending') fetchPendingRequests();
    else if (tab === 'blocked') fetchBlocked();
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

  const fetchBlocked = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/friends/bans');
      const json = await res.json();
      setBlocked(json.data || []);
    } catch (err) {
      setError('Failed to load blocked users');
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
        body: JSON.stringify({
          username: usernameInput.trim(),
          message: requestMessage.trim() || undefined,
        }),
      });

      if (res.ok) {
        const sent = usernameInput.trim();
        setUsernameInput('');
        setRequestMessage('');
        setError('');
        setSuccessMsg(`Friend request sent to ${sent}`);
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
      const res = await fetch(`/api/v1/friends/requests/${id}/accept`, { method: 'POST' });
      if (res.ok) setPending((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError('Failed to accept request');
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await fetch(`/api/v1/friends/requests/${id}/reject`, { method: 'POST' });
      if (res.ok) setPending((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError('Failed to reject request');
    }
  };

  const handleRemove = async (friendshipId) => {
    if (!confirm('Remove this friend?')) return;
    try {
      const res = await fetch(`/api/v1/friends/${friendshipId}`, { method: 'DELETE' });
      if (res.ok) setFriends((prev) => prev.filter((f) => f.id !== friendshipId));
    } catch (err) {
      setError('Failed to remove friend');
    }
  };

  const handleBlock = async (userId, username) => {
    if (!confirm(`Block ${username}? They won't be able to message you, and you'll stop being friends.`)) return;
    try {
      const res = await fetch(`/api/v1/friends/users/${userId}/ban`, { method: 'POST' });
      if (res.ok) {
        setFriends((prev) => prev.filter((f) => (f.friend_id || f.id) !== userId));
        setSuccessMsg(`${username} has been blocked.`);
      } else {
        const json = await res.json();
        setError(json.error || 'Failed to block user');
      }
    } catch (err) {
      setError('Failed to block user');
    }
  };

  const handleUnblock = async (userId, username) => {
    try {
      const res = await fetch(`/api/v1/friends/users/${userId}/ban`, { method: 'DELETE' });
      if (res.ok) {
        setBlocked((prev) => prev.filter((b) => b.user_id !== userId));
        setSuccessMsg(`${username} unblocked. Send them a new friend request to message again.`);
      }
    } catch (err) {
      setError('Failed to unblock user');
    }
  };

  const getAvatar = (name) => (name ? name[0].toUpperCase() : '?');

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Contacts</h1>
          <p className={styles.pageSubtitle}>Your friends, pending requests, and blocked users.</p>
        </div>
      </header>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.active : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            {t.key === 'pending' && pending.length > 0 && (
              <span className={styles.tabBadge}>{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {successMsg && <div className={styles.success}>{successMsg}</div>}

      {tab === 'list' && (
        <>
          {loading ? (
            <div className={styles.mutedNote}>Loading…</div>
          ) : friends.length === 0 ? (
            <div className={styles.emptyState}>
              <UserPlus size={32} className={styles.emptyIcon} strokeWidth={1.5} />
              <p>You don't have any friends yet.</p>
              <button className={styles.primaryBtn} onClick={() => setTab('find')}>
                Send a friend request
              </button>
            </div>
          ) : (
            <div className={styles.list}>
              {friends.map((friend) => (
                <div key={friend.id} className={styles.card}>
                  <div className={styles.avatar}>{getAvatar(friend.username)}</div>
                  <div className={styles.info}>
                    <strong className={styles.name}>{friend.username}</strong>
                    <span className={styles.email}>{friend.email}</span>
                  </div>
                  <div className={styles.actions}>
                    <button
                      onClick={() => navigate(`/dm/${friend.friend_id || friend.id}`)}
                      className={styles.primaryBtn}
                    >
                      Message
                    </button>
                    <button
                      onClick={() => handleRemove(friend.id)}
                      className={styles.secondaryBtn}
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => handleBlock(friend.friend_id || friend.id, friend.username)}
                      className={styles.dangerBtn}
                    >
                      Block
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'pending' && (
        <>
          {loading ? (
            <div className={styles.mutedNote}>Loading…</div>
          ) : pending.length === 0 ? (
            <div className={styles.emptyState}>
              <Inbox size={32} className={styles.emptyIcon} strokeWidth={1.5} />
              <p>No pending requests.</p>
            </div>
          ) : (
            <div className={styles.list}>
              {pending.map((req) => (
                <div key={req.id} className={styles.card}>
                  <div className={styles.avatar}>{getAvatar(req.username)}</div>
                  <div className={styles.info}>
                    <strong className={styles.name}>{req.username}</strong>
                    <span className={styles.email}>{req.email}</span>
                    {req.message && <p className={styles.requestMessage}>"{req.message}"</p>}
                  </div>
                  <div className={styles.actions}>
                    <button
                      onClick={() => handleAccept(req.id)}
                      className={styles.primaryBtn}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleReject(req.id)}
                      className={styles.secondaryBtn}
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'blocked' && (
        <>
          {loading ? (
            <div className={styles.mutedNote}>Loading…</div>
          ) : blocked.length === 0 ? (
            <div className={styles.emptyState}>
              <UserX size={32} className={styles.emptyIcon} strokeWidth={1.5} />
              <p>You haven't blocked anyone.</p>
            </div>
          ) : (
            <div className={styles.list}>
              {blocked.map((b) => (
                <div key={b.user_id} className={styles.card}>
                  <div className={styles.avatar}>{getAvatar(b.username)}</div>
                  <div className={styles.info}>
                    <strong className={styles.name}>{b.username}</strong>
                    <span className={styles.email}>{b.email}</span>
                  </div>
                  <div className={styles.actions}>
                    <button
                      onClick={() => navigate(`/dm/${b.user_id}`)}
                      className={styles.secondaryBtn}
                    >
                      View chat
                    </button>
                    <button
                      onClick={() => handleUnblock(b.user_id, b.username)}
                      className={styles.secondaryBtn}
                    >
                      Unblock
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'find' && (
        <div className={styles.findCard}>
          <h2 className={styles.findTitle}>Send a friend request</h2>
          <p className={styles.findSubtitle}>Enter the username of the person you want to add. You can include a short note.</p>
          <form onSubmit={handleSendRequest} className={styles.findForm}>
            <input
              type="text"
              placeholder="username"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              className={styles.findInput}
            />
            <textarea
              placeholder="Add a note (optional)"
              value={requestMessage}
              onChange={(e) => setRequestMessage(e.target.value)}
              maxLength={500}
              className={styles.findTextarea}
              rows={3}
            />
            <button
              type="submit"
              className={styles.primaryBtn}
              disabled={!usernameInput.trim()}
            >
              Send request
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
