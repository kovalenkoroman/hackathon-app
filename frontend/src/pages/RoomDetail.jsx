import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import * as roomsApi from '../api/rooms';
import styles from './RoomDetail.module.css';

export default function RoomDetail({ user }) {
  const { roomId } = useParams();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('members');

  useEffect(() => {
    loadRoom();
  }, [roomId]);

  const loadRoom = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await roomsApi.getRoomDetail(roomId);
      setRoom(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this room?')) return;
    try {
      await roomsApi.leaveRoom(roomId);
      window.location.href = '/';
    } catch (err) {
      setError(err.message);
    }
  };

  const handlePromote = async (userId) => {
    try {
      await roomsApi.promoteToAdmin(roomId, userId);
      await loadRoom();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDemote = async (userId) => {
    try {
      await roomsApi.demoteFromAdmin(roomId, userId);
      await loadRoom();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBan = async (userId) => {
    if (!window.confirm('Ban this user?')) return;
    try {
      await roomsApi.banMember(roomId, userId);
      await loadRoom();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <div className={styles.container}><p>Loading...</p></div>;
  if (!room) return <div className={styles.container}><p>Room not found</p></div>;

  const isOwner = room.owner_id === user?.id;
  const currentMember = room.members?.find((m) => m.user_id === user?.id);
  const isAdmin = currentMember?.role === 'admin' || isOwner;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>{room.name}</h1>
        {room.description && <p className={styles.desc}>{room.description}</p>}
        <p className={styles.meta}>
          {room.visibility === 'public' ? '🌍 Public' : '🔒 Private'} •{' '}
          {room.members?.length || 0} members
        </p>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.tabs}>
        <button
          className={activeTab === 'members' ? styles.active : ''}
          onClick={() => setActiveTab('members')}
        >
          Members
        </button>
        {isAdmin && (
          <button
            className={activeTab === 'bans' ? styles.active : ''}
            onClick={() => setActiveTab('bans')}
          >
            Bans
          </button>
        )}
      </div>

      {activeTab === 'members' && (
        <div className={styles.membersList}>
          {room.members?.map((member) => (
            <div key={member.user_id} className={styles.memberItem}>
              <div className={styles.memberInfo}>
                <p className={styles.username}>{member.username}</p>
                <p className={styles.role}>{member.role}</p>
              </div>
              {isAdmin && member.user_id !== user?.id && (
                <div className={styles.actions}>
                  {member.role === 'member' && (
                    <button
                      className={styles.promoteBtn}
                      onClick={() => handlePromote(member.user_id)}
                    >
                      Promote
                    </button>
                  )}
                  {member.role === 'admin' && (
                    <button
                      className={styles.demoteBtn}
                      onClick={() => handleDemote(member.user_id)}
                    >
                      Demote
                    </button>
                  )}
                  <button
                    className={styles.banBtn}
                    onClick={() => handleBan(member.user_id)}
                  >
                    Ban
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'bans' && isAdmin && (
        <div className={styles.bansList}>
          <p>Banned users will appear here</p>
        </div>
      )}

      <div className={styles.actions}>
        {isOwner && (
          <button className={styles.deleteBtn} onClick={() => {
            if (window.confirm('Delete this room?')) {
              roomsApi.deleteRoom(roomId).then(() => {
                window.location.href = '/';
              });
            }
          }}>
            Delete Room
          </button>
        )}
        {!isOwner && (
          <button className={styles.leaveBtn} onClick={handleLeave}>
            Leave Room
          </button>
        )}
      </div>
    </div>
  );
}
