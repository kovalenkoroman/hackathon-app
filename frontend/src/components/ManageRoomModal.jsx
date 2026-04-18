import { useState, useEffect } from 'react';
import styles from './ManageRoomModal.module.css';

export default function ManageRoomModal({ room, members, user, onClose, onMembersChanged }) {
  const [tab, setTab] = useState('members');
  const [bannedUsers, setBannedUsers] = useState([]);
  const [inviteLink, setInviteLink] = useState('');
  const [settingsName, setSettingsName] = useState(room.name);
  const [settingsDesc, setSettingsDesc] = useState(room.description || '');
  const [settingsVis, setSettingsVis] = useState(room.visibility);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isOwner = room.owner_id === user.id;
  const isMemberAdmin = members?.find(m => m.user_id === user.id)?.role === 'admin';
  const canManage = isOwner || isMemberAdmin;

  // Load banned users when Banned tab is activated
  useEffect(() => {
    if (tab === 'banned' && bannedUsers.length === 0) {
      fetchBannedUsers();
    }
  }, [tab]);

  const fetchBannedUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/rooms/${room.id}/bans`);
      if (res.ok) {
        const data = await res.json();
        setBannedUsers(data.data || []);
      }
    } catch (err) {
      console.error('Failed to load banned users:', err);
      setError('Failed to load banned users');
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async (userId) => {
    try {
      const res = await fetch(`/api/v1/rooms/${room.id}/admins/${userId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        onMembersChanged();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to promote member');
      }
    } catch (err) {
      setError('Failed to promote member');
    }
  };

  const handleDemote = async (userId) => {
    try {
      const res = await fetch(`/api/v1/rooms/${room.id}/admins/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        onMembersChanged();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to demote member');
      }
    } catch (err) {
      setError('Failed to demote member');
    }
  };

  const handleBan = async (userId) => {
    try {
      const res = await fetch(`/api/v1/rooms/${room.id}/members/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        onMembersChanged();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to ban member');
      }
    } catch (err) {
      setError('Failed to ban member');
    }
  };

  const handleUnban = async (userId) => {
    try {
      const res = await fetch(`/api/v1/rooms/${room.id}/bans/${userId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        setBannedUsers(bannedUsers.filter(u => u.id !== userId));
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to unban member');
      }
    } catch (err) {
      setError('Failed to unban member');
    }
  };

  const handleGenerateInvite = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/rooms/${room.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        const link = `${window.location.origin}/?invite=${data.data.token}`;
        setInviteLink(link);
        setError('');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to generate invitation');
      }
    } catch (err) {
      setError('Failed to generate invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInvite = () => {
    navigator.clipboard.writeText(inviteLink);
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      const updates = {};
      if (settingsName !== room.name) updates.name = settingsName;
      if (settingsDesc !== (room.description || '')) updates.description = settingsDesc;
      if (settingsVis !== room.visibility) updates.visibility = settingsVis;

      if (Object.keys(updates).length === 0) {
        setError('No changes to save');
        return;
      }

      const res = await fetch(`/api/v1/rooms/${room.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (res.ok) {
        setError('');
        onClose();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to save settings');
      }
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!window.confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`/api/v1/rooms/${room.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (res.ok) {
        window.location.href = '/';
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete room');
      }
    } catch (err) {
      setError('Failed to delete room');
    } finally {
      setLoading(false);
    }
  };

  const admins = members?.filter(m => m.role === 'admin') || [];
  const regularMembers = members?.filter(m => m.role === 'member') || [];

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Manage Room: #{room.name}</h2>
          <button onClick={onClose} className={styles.closeBtn} title="Close">
            ✕
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'members' ? styles.active : ''}`}
            onClick={() => setTab('members')}
          >
            Members
          </button>
          <button
            className={`${styles.tab} ${tab === 'admins' ? styles.active : ''}`}
            onClick={() => setTab('admins')}
          >
            Admins
          </button>
          <button
            className={`${styles.tab} ${tab === 'banned' ? styles.active : ''}`}
            onClick={() => setTab('banned')}
          >
            Banned users
          </button>
          <button
            className={`${styles.tab} ${tab === 'invitations' ? styles.active : ''}`}
            onClick={() => setTab('invitations')}
          >
            Invitations
          </button>
          {canManage && (
            <button
              className={`${styles.tab} ${tab === 'settings' ? styles.active : ''}`}
              onClick={() => setTab('settings')}
            >
              Settings
            </button>
          )}
        </div>

        <div className={styles.body}>
          {error && <div style={{ color: '#d44', marginBottom: '1rem', fontSize: '0.9rem' }}>⚠️ {error}</div>}

          {/* Members Tab */}
          {tab === 'members' && (
            <div>
              <h3>All Members ({members?.length || 0})</h3>
              {members?.length === 0 ? (
                <p className={styles.emptyState}>No members in this room</p>
              ) : (
                members.map(member => (
                  <div key={member.user_id} className={styles.memberRow}>
                    <span className={styles.memberName}>{member.username}</span>
                    {member.role !== 'member' && <span className={styles.roleTag}>{member.role}</span>}
                    <div className={styles.buttonGroup}>
                      {isOwner && member.role === 'member' && (
                        <button
                          onClick={() => handlePromote(member.user_id)}
                          className={styles.actionBtn}
                          disabled={loading}
                        >
                          Promote
                        </button>
                      )}
                      {isOwner && member.role === 'admin' && (
                        <button
                          onClick={() => handleDemote(member.user_id)}
                          className={styles.actionBtn}
                          disabled={loading}
                        >
                          Demote
                        </button>
                      )}
                      {canManage && member.user_id !== user.id && member.role !== 'owner' && (
                        <button
                          onClick={() => handleBan(member.user_id)}
                          className={`${styles.actionBtn} ${styles.dangerBtn}`}
                          disabled={loading}
                        >
                          Ban
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Admins Tab */}
          {tab === 'admins' && (
            <div>
              <h3>Admins ({admins.length})</h3>
              {admins.length === 0 ? (
                <p className={styles.emptyState}>No admins yet</p>
              ) : (
                admins.map(admin => (
                  <div key={admin.user_id} className={styles.memberRow}>
                    <span className={styles.memberName}>{admin.username}</span>
                    <span className={styles.roleTag}>admin</span>
                    <div className={styles.buttonGroup}>
                      {isOwner && (
                        <button
                          onClick={() => handleDemote(admin.user_id)}
                          className={styles.actionBtn}
                          disabled={loading}
                        >
                          Demote
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Banned Users Tab */}
          {tab === 'banned' && (
            <div>
              <h3>Banned Users ({bannedUsers.length})</h3>
              {loading && <p>Loading...</p>}
              {bannedUsers.length === 0 ? (
                <p className={styles.emptyState}>No banned users</p>
              ) : (
                bannedUsers.map(ban => (
                  <div key={ban.id} className={styles.memberRow}>
                    <span className={styles.memberName}>{ban.username}</span>
                    <span style={{ fontSize: '0.8rem', color: '#999' }}>
                      {new Date(ban.created_at).toLocaleDateString()}
                    </span>
                    <div className={styles.buttonGroup}>
                      {canManage && (
                        <button
                          onClick={() => handleUnban(ban.id)}
                          className={styles.actionBtn}
                          disabled={loading}
                        >
                          Unban
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Invitations Tab */}
          {tab === 'invitations' && (
            <div>
              <h3>Room Invitations</h3>
              <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
                Generate a one-time invitation link to invite users to this room.
              </p>
              <button onClick={handleGenerateInvite} className={styles.primaryBtn} disabled={loading}>
                {loading ? 'Generating...' : 'Generate Invitation Link'}
              </button>
              {inviteLink && (
                <>
                  <div className={styles.inviteLink}>{inviteLink}</div>
                  <button onClick={handleCopyInvite} className={styles.copyBtn}>
                    📋 Copy to clipboard
                  </button>
                </>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {tab === 'settings' && canManage && (
            <div>
              <h3>Room Settings</h3>

              <div className={styles.field}>
                <label>Room Name</label>
                <input
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  placeholder="Enter room name"
                />
              </div>

              <div className={styles.field}>
                <label>Description</label>
                <textarea
                  value={settingsDesc}
                  onChange={(e) => setSettingsDesc(e.target.value)}
                  placeholder="Enter room description"
                />
              </div>

              <div className={styles.field}>
                <label>Visibility</label>
                <select value={settingsVis} onChange={(e) => setSettingsVis(e.target.value)}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>

              <div className={styles.formActions}>
                <button onClick={handleSaveSettings} className={styles.primaryBtn} disabled={loading}>
                  {loading ? 'Saving...' : 'Save changes'}
                </button>
                <button onClick={onClose} className={styles.secondaryBtn}>
                  Cancel
                </button>
              </div>

              {isOwner && (
                <div className={styles.deleteSection}>
                  <div className={styles.deleteTitle}>⚠️ Danger Zone</div>
                  <p style={{ fontSize: '0.85rem', color: '#666', marginBottom: '1rem' }}>
                    Deleting a room is permanent and cannot be undone.
                  </p>
                  <button
                    onClick={handleDeleteRoom}
                    className={`${styles.primaryBtn} ${styles.dangerBtn}`}
                    style={{ background: '#d44', borderColor: '#d44' }}
                    disabled={loading}
                  >
                    Delete Room
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
