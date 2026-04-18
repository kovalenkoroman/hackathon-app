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

  const ownerMember = members?.find(m => m.role === 'owner');
  const adminMembers = members?.filter(m => m.role === 'admin') || [];
  const regularMembers = members?.filter(m => m.role === 'member') || [];

  return (
    <div className={styles.panel}>
      <h2 className={styles.roomTitle}>Room info</h2>

      <div className={styles.infoSection}>
        <div className={styles.infoItem}>
          <span className={styles.label}>Type:</span>
          <span className={styles.value}>{room.visibility === 'public' ? 'Public' : 'Private'}</span>
        </div>

        <div className={styles.infoItem}>
          <span className={styles.label}>Owner:</span>
          <span className={styles.value}>{ownerMember?.username || 'Unknown'}</span>
        </div>
      </div>

      {adminMembers.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Admins ({adminMembers.length})</h3>
          <div className={styles.list}>
            {adminMembers.map(admin => (
              <div key={admin.user_id} className={styles.listItem}>
                {admin.username}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Members ({regularMembers.length})</h3>
        <div className={styles.list}>
          {regularMembers.length > 0 ? (
            regularMembers.map(member => (
              <div key={member.user_id} className={styles.listItem}>
                {member.username}
              </div>
            ))
          ) : (
            <div style={{ fontSize: '0.85rem', color: '#999', padding: '0.5rem' }}>No regular members</div>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <button onClick={() => setShowInviteModal(true)} className={styles.actionLink}>
          📨 Invite user
        </button>
        {canManage && (
          <button onClick={onManage} className={styles.actionLink}>
            ⚙️ Manage room
          </button>
        )}
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
