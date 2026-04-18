import { useState } from 'react';
import styles from './RoomPanel.module.css';

export default function RoomPanel({ room, members, user, onInvite, onManage, onBan, onRemove, onPromote, onDemote }) {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteUsername, setInviteUsername] = useState('');

  const isOwner = room && user && room.owner_id === user.id;
  const isMemberAdmin = members?.find(m => m.user_id === user?.id)?.role === 'admin';
  const canManage = isOwner || isMemberAdmin;

  const handleInvite = async () => {
    if (!inviteUsername.trim()) return;
    try {
      const res = await fetch(`/api/v1/rooms/${room.id}/invitations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      if (res.ok) {
        const data = await res.json();
        const inviteLink = `${window.location.origin}/?invite=${data.data.token}`;
        alert(`Invitation created:\n${inviteLink}`);
        setInviteUsername('');
        setShowInviteModal(false);
      }
    } catch (err) {
      alert('Failed to create invitation');
    }
  };

  const getPresenceIcon = (status) => {
    switch (status) {
      case 'online':
        return '●';
      case 'afk':
        return '◐';
      default:
        return '○';
    }
  };

  if (!room) return null;

  return (
    <div className={styles.panel}>
      <h2>{room.name}</h2>
      <p className={styles.description}>{room.description || 'No description'}</p>
      <div className={styles.info}>
        <p><strong>Visibility:</strong> {room.visibility}</p>
        <p><strong>Owner:</strong> {members?.find(m => m.role === 'owner')?.username || 'Unknown'}</p>
        <p><strong>Members:</strong> {members?.length || 0}</p>
      </div>

      {canManage && (
        <div className={styles.actions}>
          <button onClick={() => setShowInviteModal(true)} className={styles.btn}>
            📨 Invite
          </button>
          <button onClick={onManage} className={styles.btn}>
            ⚙️ Manage
          </button>
        </div>
      )}

      <div className={styles.memberList}>
        <h3>Members ({members?.length})</h3>
        {members?.map(member => (
          <div key={member.user_id} className={styles.member}>
            <div className={styles.memberInfo}>
              <span className={styles.username}>{member.username}</span>
              <span className={styles.role}>{member.role}</span>
            </div>
            {canManage && member.user_id !== user?.id && (
              <div className={styles.memberActions}>
                {isOwner && member.role === 'member' && (
                  <>
                    <button onClick={() => onPromote(member.user_id)} className={styles.iconBtn}>⬆️</button>
                    <button onClick={() => onBan(member.user_id)} className={styles.iconBtn}>🚫</button>
                  </>
                )}
                {isOwner && member.role === 'admin' && (
                  <button onClick={() => onDemote(member.user_id)} className={styles.iconBtn}>⬇️</button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h3>Create Invitation</h3>
            <p>Generate an invitation link for this room:</p>
            <button
              onClick={handleInvite}
              className={styles.primaryBtn}
            >
              Generate Link
            </button>
            <button
              onClick={() => setShowInviteModal(false)}
              className={styles.secondaryBtn}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
