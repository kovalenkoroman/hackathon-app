import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './MyRooms.module.css';

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
      // Filter to only show private rooms
      const privateRooms = (json.data || []).filter(room => room.visibility === 'private');
      setRooms(privateRooms);
    } catch (err) {
      setError('Failed to load private rooms');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1>My Private Rooms</h1>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <p>Loading...</p>
      ) : rooms.length === 0 ? (
        <p className={styles.empty}>
          You don't have any private rooms yet.{' '}
          <a href="/catalog" className={styles.link}>Create one</a>
        </p>
      ) : (
        <div className={styles.roomsList}>
          {rooms.map((room) => (
            <div key={room.id} className={styles.roomCard}>
              <div className={styles.roomInfo}>
                <h2 className={styles.roomName}>{room.name}</h2>
                {room.description && (
                  <p className={styles.roomDesc}>{room.description}</p>
                )}
                <div className={styles.roomMeta}>
                  <span className={styles.memberCount}>
                    {room.member_count || 0} member{(room.member_count || 0) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <button
                className={styles.enterBtn}
                onClick={() => navigate(`/rooms/${room.id}`)}
              >
                Enter Room
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.back}>
        <a href="/" className={styles.link}>← Back to home</a>
      </div>
    </div>
  );
}
