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
  const [showCreateModal, setShowCreateModal] = useState(false);

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
      const newRoom = await roomsApi.createRoom(createName, createDesc, createVis);
      setCreateName('');
      setCreateDesc('');
      setCreateVis('public');
      setShowCreateModal(false);
      navigate(`/rooms/${newRoom.id}`);
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
      <div className={styles.catalogPanel}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Public Rooms</h2>
          <button onClick={() => setShowCreateModal(true)} style={{ padding: '0.5rem 1rem', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            + Create Room
          </button>
        </div>

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

      {/* Create Room Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '8px', maxWidth: '400px', width: '90%', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2>Create Room</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  placeholder="Room name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <textarea
                  placeholder="Description (optional)"
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', minHeight: '80px', fontFamily: 'inherit' }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <select value={createVis} onChange={(e) => setCreateVis(e.target.value)} style={{ width: '100%', padding: '0.5rem', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px' }}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '0.5rem 1rem', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#0066cc', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
