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
      <div className={styles.catalogPanel}>
        <h2>Private Rooms</h2>

        {error && <p className={styles.error}>{error}</p>}
        {loading && <p>Loading...</p>}

        <div className={styles.roomsList}>
          {rooms.map((room) => (
            <div key={room.id} className={styles.roomCard} onClick={() => navigate(`/rooms/${room.id}`)}>
              <h3>{room.name}</h3>
              {room.description && <p>{room.description}</p>}
              <p className={styles.meta}>Members: {room.member_count || 0}</p>
              <button onClick={(e) => { e.stopPropagation(); navigate(`/rooms/${room.id}`); }} style={{ width: '100%', backgroundColor: '#667eea', color: 'white', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', marginTop: '1rem' }}>Enter</button>
            </div>
          ))}
        </div>

        {!loading && rooms.length === 0 && <p className={styles.empty}>No private rooms</p>}
      </div>
    </div>
  );
}
