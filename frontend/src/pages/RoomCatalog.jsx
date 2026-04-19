import { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import * as roomsApi from '../api/rooms';
import * as authApi from '../api/auth';
import styles from './RoomCatalog.module.css';

export default function RoomCatalog() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rooms, setRooms] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [createVis, setCreateVis] = useState('public');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userRoomRoles, setUserRoomRoles] = useState({});

  useEffect(() => {
    loadUserRooms();
    loadRooms();
  }, [search]);

  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreateModal(true);
    }
  }, [searchParams]);

  const loadUserRooms = async () => {
    try {
      const data = await roomsApi.listUserRooms();
      const roles = {};
      data.forEach(r => {
        roles[r.id] = r.role;
      });
      setUserRoomRoles(roles);
    } catch (err) {
      console.error('Failed to fetch user rooms:', err);
    }
  };

  const isUserInRoom = (room) => {
    return userRoomRoles.hasOwnProperty(room.id);
  };

  const isUserOwner = (room) => {
    return userRoomRoles[room.id] === 'owner';
  };

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
      await loadUserRooms();
      await loadRooms();
      navigate(`/rooms/${roomId}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLeave = async (e, roomId) => {
    e.stopPropagation();
    try {
      await roomsApi.leaveRoom(roomId);
      await loadUserRooms();
      await loadRooms();
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.container}>
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
          {rooms.map((room) => {
            const userInRoom = isUserInRoom(room);
            const isOwner = isUserOwner(room);
            return (
              <div key={room.id} className={styles.roomCard}>
                <h3 onClick={() => userInRoom && navigate(`/rooms/${room.id}`)} style={{ cursor: userInRoom ? 'pointer' : 'default' }}>{room.name}</h3>
                {room.description && <p>{room.description}</p>}
                <p className={styles.meta}>Members: {room.member_count || 0}</p>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  {userInRoom ? (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/rooms/${room.id}`); }} style={{ flex: 1, backgroundColor: '#667eea', color: 'white', padding: '0.75rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}>Enter</button>
                      {!isOwner && (
                        <button onClick={(e) => handleLeave(e, room.id)} style={{ flex: 1, backgroundColor: '#ff9800', color: 'white', padding: '0.75rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}>Leave</button>
                      )}
                    </>
                  ) : (
                    <button onClick={(e) => { e.stopPropagation(); handleJoin(room.id); }} style={{ width: '100%', backgroundColor: '#28a745', color: 'white', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '600' }}>Join</button>
                  )}
                </div>
              </div>
            );
          })}
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
                <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '0.75rem 1.5rem', backgroundColor: '#f0f0f0', border: '1px solid #ccc', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: '600' }}>
                  Cancel
                </button>
                <button type="submit" style={{ padding: '0.75rem 1.5rem', backgroundColor: '#667eea', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '1rem', fontWeight: '600' }}>
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
