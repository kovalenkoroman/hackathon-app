import { useState, useEffect } from 'react';
import { Send, Settings, LogOut, Globe, Lock, X } from 'lucide-react';
import styles from './RoomPanel.module.css';
import PresenceDot from './PresenceDot';

export default function RoomPanel({ room, members, user, presence = {}, onInvite, onManage, onBan, onRemove, onPromote, onDemote, onLeave }) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [friendIds, setFriendIds] = useState(new Set());
  const [pendingRequestIds, setPendingRequestIds] = useState(new Set());

  useEffect(() => {
    loadFriends();
  }, []);

  const loadFriends = async () => {
    try {
      const res = await fetch('/api/v1/friends');
      if (res.ok) {
        const json = await res.json();
        const ids = new Set((json.data || []).map((f) => f.friend_id || f.id));
        setFriendIds(ids);
      }
    } catch (err) {
      /* non-fatal */
    }
  };

  const handleAddFriend = async (memberUserId, memberUsername) => {
    try {
      const res = await fetch('/api/v1/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: memberUsername }),
      });
      if (res.ok) {
        setPendingRequestIds((prev) => new Set(prev).add(memberUserId));
      }
    } catch (err) {
      /* non-fatal */
    }
  };

  const isOwner = room && user && room.owner_id === user.id;
  const isMemberAdmin = members?.find((m) => m.user_id === user?.id)?.role === 'admin';
  const canManage = isOwner || isMemberAdmin;

  const handleLeave = async () => {
    if (!confirm('Are you sure you want to leave this room?')) return;
    try {
      await fetch(`/api/v1/rooms/${room.id}/leave`, { method: 'POST', credentials: 'include' });
      if (onLeave) onLeave();
    } catch (err) {
      alert('Failed to leave room');
    }
  };

  const handleGenerateInvite = async () => {
    try {
      const res = await fetch(`/api/v1/rooms/${room.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        const link = `${window.location.origin}/?invite=${data.data.token}`;
        setInviteLink(link);
      }
    } catch (err) {
      alert('Failed to create invitation');
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      /* ignore */
    }
  };

  const openInviteModal = () => {
    setInviteLink('');
    setCopied(false);
    setShowInviteModal(true);
  };

  if (!room) return null;

  const getAvatar = (name) => (name ? name[0].toUpperCase() : '?');

  const ownerMember = members?.find((m) => m.role === 'owner');
  const adminMembers = members?.filter((m) => m.role === 'admin') || [];
  const regularMembers = members?.filter((m) => m.role === 'member') || [];

  const renderMember = (m) => {
    const isSelf = m.user_id === user?.id;
    const isFriend = friendIds.has(m.user_id);
    const requested = pendingRequestIds.has(m.user_id);
    const canAddFriend = !isSelf && !isFriend;
    const status = m.user_id === user?.id ? 'online' : (presence[m.user_id] || 'offline');
    return (
      <div key={m.user_id} className={styles.memberRow}>
        <div className={styles.memberAvatar}>
          {getAvatar(m.username)}
          <span className={styles.avatarPresence}><PresenceDot status={status} /></span>
        </div>
        <span className={styles.memberName}>{m.username}</span>
        {canAddFriend && !requested && (
          <button
            type="button"
            onClick={() => handleAddFriend(m.user_id, m.username)}
            className={styles.addFriendBtn}
            title={`Send friend request to ${m.username}`}
          >
            +
          </button>
        )}
        {requested && <span className={styles.requestedBadge} title="Request sent">✓</span>}
      </div>
    );
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h2 className={styles.roomName}>{room.name}</h2>
        <span className={`${styles.visibilityBadge} ${room.visibility === 'public' ? styles.public : styles.private}`}>
          {room.visibility === 'public' ? <Globe size={11} /> : <Lock size={11} />}
          {room.visibility === 'public' ? 'Public' : 'Private'}
        </span>
      </div>

      {room.description && (
        <p className={styles.description}>{room.description}</p>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Owner</h3>
        </div>
        {ownerMember ? renderMember(ownerMember) : <div className={styles.mutedNote}>Unknown</div>}
      </div>

      {adminMembers.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Admins</h3>
            <span className={styles.count}>{adminMembers.length}</span>
          </div>
          <div className={styles.memberList}>
            {adminMembers.map(renderMember)}
          </div>
        </div>
      )}

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <h3 className={styles.sectionTitle}>Members</h3>
          <span className={styles.count}>{regularMembers.length}</span>
        </div>
        <div className={styles.memberList}>
          {regularMembers.length > 0
            ? regularMembers.map(renderMember)
            : <div className={styles.mutedNote}>No regular members</div>}
        </div>
      </div>

      <div className={styles.actions}>
        {canManage && (
          <button onClick={openInviteModal} className={styles.actionBtn}>
            <Send size={15} className={styles.actionIcon} />
            <span>Invite by link</span>
          </button>
        )}
        {canManage && (
          <button onClick={onManage} className={styles.actionBtn}>
            <Settings size={15} className={styles.actionIcon} />
            <span>Manage room</span>
          </button>
        )}
        {!isOwner && (
          <button onClick={handleLeave} className={`${styles.actionBtn} ${styles.dangerAction}`}>
            <LogOut size={15} className={styles.actionIcon} />
            <span>Leave room</span>
          </button>
        )}
      </div>

      {showInviteModal && (
        <div className={styles.modalOverlay} onClick={() => setShowInviteModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <header className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Invite to {room.name}</h3>
              <button
                className={styles.modalClose}
                onClick={() => setShowInviteModal(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </header>
            <div className={styles.modalBody}>
              {!inviteLink ? (
                <>
                  <p className={styles.modalDesc}>Generate a shareable invitation link. It's valid for 24 hours.</p>
                  <button className={styles.primaryBtn} onClick={handleGenerateInvite}>
                    Generate invite link
                  </button>
                </>
              ) : (
                <>
                  <p className={styles.modalDesc}>Share this link with someone you want to invite:</p>
                  <div className={styles.linkBox}>
                    <input
                      type="text"
                      readOnly
                      value={inviteLink}
                      className={styles.linkInput}
                      onClick={(e) => e.target.select()}
                    />
                    <button
                      onClick={handleCopy}
                      className={styles.copyBtn}
                    >
                      {copied ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
