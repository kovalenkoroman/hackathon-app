import { useState, useEffect, Fragment } from 'react';
import { X } from 'lucide-react';
import styles from './ManageRoomModal.module.css';

export default function ManageRoomModal({ room, members, user, presence, onClose, onMembersChanged }) {
  const [tab, setTab] = useState('members');
  const [bannedUsers, setBannedUsers] = useState([]);
  const [settingsName, setSettingsName] = useState(room.name);
  const [settingsDesc, setSettingsDesc] = useState(room.description || '');
  const [settingsVis, setSettingsVis] = useState(room.visibility);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');

  const isOwner = room.owner_id === user.id;
  const isMemberAdmin = members?.find((m) => m.user_id === user.id)?.role === 'admin';
  const canManage = isOwner || isMemberAdmin;

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
      setError('Failed to load banned users');
    } finally {
      setLoading(false);
    }
  };

  const runMemberAction = async (url, method, onSuccess) => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' } });
      if (res.ok) {
        onSuccess?.();
        onMembersChanged();
      } else {
        const data = await res.json();
        setError(data.error || 'Action failed');
      }
    } catch (err) {
      setError('Action failed');
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = (userId) => runMemberAction(`/api/v1/rooms/${room.id}/admins/${userId}`, 'POST');
  const handleDemote = (userId) => runMemberAction(`/api/v1/rooms/${room.id}/admins/${userId}`, 'DELETE');
  // Per req 2.4.8, removing a member from a room is treated as a ban.
  const handleRemoveAndBan = (userId, username) => {
    if (!confirm(`Remove ${username} from the room? They will be banned and won't be able to rejoin unless unbanned.`)) return;
    runMemberAction(`/api/v1/rooms/${room.id}/members/${userId}/ban`, 'POST');
  };
  const handleUnban = (userId) => runMemberAction(`/api/v1/rooms/${room.id}/bans/${userId}`, 'DELETE', () => {
    setBannedUsers((prev) => prev.filter((u) => u.user_id !== userId));
  });

  const handleSendInvite = async () => {
    const trimmed = inviteUsername.trim();
    if (!trimmed) return;
    try {
      setLoading(true);
      setError('');
      setInviteSuccess('');
      const res = await fetch(`/api/v1/rooms/${room.id}/members/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username: trimmed }),
      });
      const data = await res.json();
      if (res.ok) {
        setInviteUsername('');
        setInviteSuccess(`${trimmed} has been added to the room.`);
        onMembersChanged();
      } else {
        setError(data.error || 'Failed to invite user');
      }
    } catch (err) {
      setError('Failed to invite user');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      setError('');
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
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        await onMembersChanged();
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
    if (!window.confirm('Are you sure you want to delete this room? This action cannot be undone.')) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/rooms/${room.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
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

  const getStatusLabel = (userId) => presence?.[userId] || 'offline';
  const getStatusDot = (status) => (status === 'online' ? '●' : status === 'afk' ? '◐' : '○');
  const getAvatar = (name) => (name ? name[0].toUpperCase() : '?');

  const filteredMembers = members?.filter((m) =>
    m.username.toLowerCase().includes(memberSearch.toLowerCase())
  ) || [];

  const admins = members?.filter((m) => m.role === 'admin') || [];

  const TABS = [
    { key: 'members', label: 'Members' },
    { key: 'admins', label: 'Admins' },
    { key: 'banned', label: 'Banned' },
    { key: 'invitations', label: 'Invite' },
    ...(canManage ? [{ key: 'settings', label: 'Settings' }] : []),
  ];

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <div>
            <h2 className={styles.title}>Manage room</h2>
            <p className={styles.subtitle}>{room.name}</p>
          </div>
          <button onClick={onClose} className={styles.closeBtn} title="Close"><X size={18} /></button>
        </header>

        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.key}
              className={`${styles.tab} ${tab === t.key ? styles.active : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className={styles.body}>
          {error && <div className={styles.error}>{error}</div>}

          {tab === 'members' && (
            <>
              <input
                type="text"
                placeholder="Search members…"
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                className={styles.searchInput}
              />

              {filteredMembers.length === 0 ? (
                <div className={styles.emptyState}>
                  {memberSearch ? 'No members match your search' : 'No members in this room'}
                </div>
              ) : (
                <div className={styles.memberList}>
                  {filteredMembers.map((member) => {
                    const status = getStatusLabel(member.user_id);
                    return (
                      <div key={member.user_id} className={styles.memberRow}>
                        <div className={styles.memberAvatar}>{getAvatar(member.username)}</div>
                        <div className={styles.memberInfo}>
                          <div className={styles.memberName}>{member.username}</div>
                          <div className={styles.memberMeta}>
                            <span className={`${styles.statusBadge} ${styles[`status_${status}`]}`}>
                              {getStatusDot(status)} {status}
                            </span>
                            <span className={styles.roleTag}>{member.role}</span>
                          </div>
                        </div>
                        <div className={styles.memberActions}>
                          {member.role === 'owner' && <span className={styles.noActions}>—</span>}
                          {member.role === 'admin' && member.user_id !== user.id && isOwner && (
                            <>
                              <button onClick={() => handleDemote(member.user_id)} className={styles.secondaryBtn} disabled={loading}>Demote</button>
                              <button onClick={() => handleRemoveAndBan(member.user_id, member.username)} className={styles.dangerBtn} disabled={loading}>Remove & ban</button>
                            </>
                          )}
                          {member.role === 'member' && canManage && (
                            <>
                              {isOwner && <button onClick={() => handlePromote(member.user_id)} className={styles.secondaryBtn} disabled={loading}>Make admin</button>}
                              <button onClick={() => handleRemoveAndBan(member.user_id, member.username)} className={styles.dangerBtn} disabled={loading}>Remove & ban</button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {tab === 'admins' && (
            <>
              {admins.length === 0 ? (
                <div className={styles.emptyState}>No admins yet</div>
              ) : (
                <div className={styles.memberList}>
                  {admins.map((admin) => (
                    <div key={admin.user_id} className={styles.memberRow}>
                      <div className={styles.memberAvatar}>{getAvatar(admin.username)}</div>
                      <div className={styles.memberInfo}>
                        <div className={styles.memberName}>{admin.username}</div>
                        <div className={styles.memberMeta}>
                          <span className={styles.roleTag}>admin</span>
                        </div>
                      </div>
                      <div className={styles.memberActions}>
                        {isOwner && (
                          <button onClick={() => handleDemote(admin.user_id)} className={styles.secondaryBtn} disabled={loading}>
                            Demote
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'banned' && (
            <>
              {loading && bannedUsers.length === 0 ? (
                <div className={styles.mutedNote}>Loading…</div>
              ) : bannedUsers.length === 0 ? (
                <div className={styles.emptyState}>No banned users</div>
              ) : (
                <div className={styles.memberList}>
                  {bannedUsers.map((ban) => (
                    <div key={ban.user_id} className={styles.memberRow}>
                      <div className={styles.memberAvatar}>{getAvatar(ban.username)}</div>
                      <div className={styles.memberInfo}>
                        <div className={styles.memberName}>{ban.username}</div>
                        <div className={styles.memberMeta}>
                          <span>Banned by {ban.banned_by_username || 'unknown'}</span>
                          <span className={styles.dot}>•</span>
                          <span>{new Date(ban.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className={styles.memberActions}>
                        {canManage && (
                          <button onClick={() => handleUnban(ban.user_id)} className={styles.secondaryBtn} disabled={loading}>
                            Unban
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === 'invitations' && (
            <div className={styles.inviteCard}>
              <label htmlFor="inviteInput" className={styles.fieldLabel}>Invite by username</label>
              <p className={styles.fieldHint}>They'll be added to the room immediately.</p>
              <div className={styles.inviteRow}>
                <input
                  id="inviteInput"
                  type="text"
                  value={inviteUsername}
                  onChange={(e) => {
                    setInviteUsername(e.target.value);
                    setInviteSuccess('');
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && handleSendInvite()}
                  placeholder="username"
                  className={styles.fieldInput}
                  disabled={loading}
                />
                <button
                  onClick={handleSendInvite}
                  className={styles.primaryBtn}
                  disabled={loading || !inviteUsername.trim()}
                >
                  {loading ? 'Sending…' : 'Send invite'}
                </button>
              </div>
              {inviteSuccess && <div className={styles.success}>{inviteSuccess}</div>}
            </div>
          )}

          {tab === 'settings' && canManage && (
            <div className={styles.settings}>
              <div className={styles.field}>
                <label className={styles.fieldLabel}>Room name</label>
                <input
                  type="text"
                  value={settingsName}
                  onChange={(e) => setSettingsName(e.target.value)}
                  placeholder="Enter room name"
                  className={styles.fieldInput}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Description</label>
                <textarea
                  value={settingsDesc}
                  onChange={(e) => setSettingsDesc(e.target.value)}
                  placeholder="What is this room about?"
                  className={styles.fieldTextarea}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.fieldLabel}>Visibility</label>
                <select
                  value={settingsVis}
                  onChange={(e) => setSettingsVis(e.target.value)}
                  className={styles.fieldInput}
                >
                  <option value="public">Public — anyone can find and join</option>
                  <option value="private">Private — invite only</option>
                </select>
              </div>

              <div className={styles.settingsActions}>
                <button onClick={handleSaveSettings} className={styles.primaryBtn} disabled={loading}>
                  {loading ? 'Saving…' : 'Save changes'}
                </button>
              </div>

              {isOwner && (
                <div className={styles.dangerZone}>
                  <h4 className={styles.dangerTitle}>Danger zone</h4>
                  <p className={styles.dangerDesc}>Delete this room and all its messages. This cannot be undone.</p>
                  <button onClick={handleDeleteRoom} className={styles.dangerBtn} disabled={loading}>
                    Delete room
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
