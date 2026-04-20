import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Lock, Plus } from 'lucide-react';
import styles from './RoomCatalog.module.css';

export default function MyRooms() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMyRooms();
  }, []);

  const loadMyRooms = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/v1/rooms/mine');
      const json = await res.json();
      const privateRooms = (json.data || []).filter((room) => room.visibility === 'private');
      setRooms(privateRooms);
    } catch (err) {
      setError('Failed to load private rooms');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Private rooms</h1>
          <p className={styles.pageSubtitle}>Invite-only rooms you're a member of.</p>
        </div>
        <button
          className={styles.primaryBtn}
          onClick={() => navigate('/catalog?create=true')}
        >
          <Plus size={16} /> Create room
        </button>
      </header>

      {error && <div className={styles.error}>{error}</div>}
      {loading && <div className={styles.mutedNote}>Loading rooms…</div>}

      {!loading && rooms.length === 0 && (
        <div className={styles.emptyState}>
          <Lock size={32} className={styles.emptyIcon} strokeWidth={1.5} />
          <p>You don't have any private rooms yet.</p>
          <button
            className={styles.primaryBtn}
            onClick={() => navigate('/catalog?create=true')}
          >
            Create a private room
          </button>
        </div>
      )}

      <div className={styles.roomsGrid}>
        {rooms.map((room) => (
          <article
            key={room.id}
            className={`${styles.roomCard} ${styles.roomCardJoined}`}
          >
            <span className={styles.joinedBadge}>{room.role || 'member'}</span>
            <h3 className={styles.roomName}>{room.name}</h3>
            {room.description && <p className={styles.roomDesc}>{room.description}</p>}
            <div className={styles.roomMeta}>
              <span className={styles.metaItem}>
                <Users size={13} className={styles.metaIcon} />
                {room.member_count || 0} {room.member_count === 1 ? 'member' : 'members'}
              </span>
            </div>
            <div className={styles.roomActions}>
              <button
                className={styles.primaryBtn}
                onClick={() => navigate(`/rooms/${room.id}`)}
              >
                Enter
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
