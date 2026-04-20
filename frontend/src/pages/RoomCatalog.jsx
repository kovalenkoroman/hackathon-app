import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, X, Plus, Search } from 'lucide-react';
import * as roomsApi from '../api/rooms';
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
      data.forEach((r) => { roles[r.id] = r.role; });
      setUserRoomRoles(roles);
    } catch (err) {
      console.error('Failed to fetch user rooms:', err);
    }
  };

  const isUserInRoom = (room) => userRoomRoles.hasOwnProperty(room.id);
  const isUserOwner = (room) => userRoomRoles[room.id] === 'owner';

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
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Public rooms</h1>
          <p className={styles.pageSubtitle}>Browse and join open discussion rooms.</p>
        </div>
        <button className={styles.primaryBtn} onClick={() => setShowCreateModal(true)}>
          <Plus size={16} /> Create room
        </button>
      </header>

      <div className={styles.searchRow}>
        <input
          type="text"
          placeholder="Search rooms by name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {loading && <div className={styles.mutedNote}>Loading rooms…</div>}

      {!loading && rooms.length === 0 && (
        <div className={styles.emptyState}>
          <Search size={32} className={styles.emptyIcon} strokeWidth={1.5} />
          <p>{search ? `No rooms match "${search}"` : 'No public rooms yet'}</p>
          {!search && (
            <button className={styles.primaryBtn} onClick={() => setShowCreateModal(true)}>
              Create the first one
            </button>
          )}
        </div>
      )}

      <div className={styles.roomsGrid}>
        {rooms.map((room) => {
          const userInRoom = isUserInRoom(room);
          const isOwner = isUserOwner(room);
          return (
            <article
              key={room.id}
              className={`${styles.roomCard} ${userInRoom ? styles.roomCardJoined : ''}`}
            >
              {userInRoom && <span className={styles.joinedBadge}>Joined</span>}
              <h3 className={styles.roomName}>{room.name}</h3>
              {room.description && <p className={styles.roomDesc}>{room.description}</p>}
              <div className={styles.roomMeta}>
                <span className={styles.metaItem}>
                  <Users size={13} className={styles.metaIcon} />
                  {room.member_count || 0} {room.member_count === 1 ? 'member' : 'members'}
                </span>
              </div>
              <div className={styles.roomActions}>
                {userInRoom ? (
                  <>
                    <button
                      className={styles.primaryBtn}
                      onClick={() => navigate(`/rooms/${room.id}`)}
                    >
                      Enter
                    </button>
                    {!isOwner && (
                      <button
                        className={styles.secondaryBtn}
                        onClick={(e) => handleLeave(e, room.id)}
                      >
                        Leave
                      </button>
                    )}
                  </>
                ) : (
                  <button
                    className={styles.primaryBtn}
                    onClick={() => handleJoin(room.id)}
                  >
                    Join room
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {showCreateModal && (
        <div className={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <header className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>Create a new room</h2>
              <button
                className={styles.modalClose}
                onClick={() => setShowCreateModal(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </header>
            <form onSubmit={handleCreate} className={styles.createForm}>
              <div className={styles.field}>
                <label htmlFor="roomName">Room name</label>
                <input
                  id="roomName"
                  type="text"
                  placeholder="e.g. Design team"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="roomDesc">Description <span className={styles.optional}>(optional)</span></label>
                <textarea
                  id="roomDesc"
                  placeholder="What is this room about?"
                  value={createDesc}
                  onChange={(e) => setCreateDesc(e.target.value)}
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="roomVis">Visibility</label>
                <select
                  id="roomVis"
                  value={createVis}
                  onChange={(e) => setCreateVis(e.target.value)}
                >
                  <option value="public">Public — anyone can find and join</option>
                  <option value="private">Private — invite only</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.secondaryBtn}
                  onClick={() => setShowCreateModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.primaryBtn}>
                  Create room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
