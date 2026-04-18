import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import * as roomsApi from '../api/rooms';
import styles from './RoomCatalog.module.css';

export default function RoomCatalog() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createVis, setCreateVis] = useState('public');

  useEffect(() => {
    loadRooms();
  }, [search]);

  const loadRooms = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await roomsApi.listPublicRooms(search);
      setRooms(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await roomsApi.createRoom(createName, createDesc, createVis);
      setCreateName('');
      setCreateDesc('');
      setCreateVis('public');
      await loadRooms();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleJoin = async (roomId) => {
    try {
      await roomsApi.joinRoom(roomId);
      await loadRooms();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.createPanel}>
        <h2>Create Room</h2>
        <form onSubmit={handleCreate}>
          <input
            type="text"
            placeholder="Room name"
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            required
          />
          <textarea
            placeholder="Description (optional)"
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
          />
          <select value={createVis} onChange={(e) => setCreateVis(e.target.value)}>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <button type="submit">Create</button>
        </form>
      </div>

      <div className={styles.catalogPanel}>
        <h2>Public Rooms</h2>
        <input
          type="text"
          placeholder="Search rooms..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />

        {error && <p className={styles.error}>{error}</p>}
        {loading && <p>Loading...</p>}

        <div className={styles.roomsList}>
          {rooms.map((room) => (
            <div key={room.id} className={styles.roomCard} onClick={() => navigate(`/rooms/${room.id}`)}>
              <h3>{room.name}</h3>
              {room.description && <p>{room.description}</p>}
              <p className={styles.meta}>Members: {room.member_count || 0}</p>
              <button onClick={(e) => { e.stopPropagation(); handleJoin(room.id); }}>Join</button>
            </div>
          ))}
        </div>

        {!loading && rooms.length === 0 && <p>No rooms found</p>}
      </div>
    </div>
  );
}
