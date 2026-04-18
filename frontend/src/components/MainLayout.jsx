import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import RoomPanel from './RoomPanel';
import ManageRoomModal from './ManageRoomModal';
import { RoomContext } from '../RoomContext';
import * as roomsApi from '../api/rooms';
import * as friendsApi from '../api/friends';
import styles from './MainLayout.module.css';

export default function MainLayout({ user, onLogout, wsState, presence, children }) {
  const navigate = useNavigate();
  const { roomInfo, roomMembers, setRoomInfo, setRoomMembers } = useContext(RoomContext);
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [publicRooms, setPublicRooms] = useState([]);
  const [privateRooms, setPrivateRooms] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showManageModal, setShowManageModal] = useState(false);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      // Fetch public rooms
      const publicRes = await fetch('/api/v1/rooms?visibility=public', { credentials: 'include' });
      if (publicRes.ok) {
        const publicData = await publicRes.json();
        setPublicRooms(publicData.data || []);
      }

      // Fetch user's private rooms (filters to only private ones)
      const privateRes = await fetch('/api/v1/rooms/mine', { credentials: 'include' });
      if (privateRes.ok) {
        const privateData = await privateRes.json();
        // Filter to only show private rooms (visibility: 'private')
        const onlyPrivate = (privateData.data || []).filter(room => room.visibility === 'private');
        setPrivateRooms(onlyPrivate);
      }
    } catch (error) {
      console.error('Failed to fetch rooms:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms();
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const data = await friendsApi.getFriends();
      setContacts(data);
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    }
  };

  const getPresenceIcon = (status) => {
    switch (status) {
      case 'online':
        return '●';
      case 'afk':
        return '◐';
      case 'offline':
        return '○';
      default:
        return '○';
    }
  };

  const handleRoomClick = (roomId) => {
    navigate(`/rooms/${roomId}`);
  };

  const handleMembersChanged = async () => {
    if (!roomInfo) return;
    try {
      const updated = await roomsApi.getRoomDetail(roomInfo.id);
      setRoomInfo(updated);
      setRoomMembers(updated.members || []);
      // Refresh room lists in case visibility changed
      await fetchRooms();
    } catch (error) {
      console.error('Failed to refresh room data:', error);
    }
  };

  return (
    <div className={styles.layoutContainer}>
      {/* Top Navigation - Wireframe style */}
      <nav className={styles.topNav}>
        <div className={styles.navBrand}>
          💬 Chat
        </div>
        <div className={styles.navLinks}>
          <a href="/catalog">Public Rooms</a>
          <a href="/my-rooms">Private Rooms</a>
          <a href="/friends">Contacts</a>
          <a href="/sessions">Sessions</a>
          <div className={styles.profileDropdown}>
            <span className={styles.profileBtn}>{user?.username} ▼</span>
          </div>
        </div>
        <button onClick={onLogout} className={styles.logoutBtn}>Sign out</button>
      </nav>

      {/* Main Layout - 3 columns */}
      <div className={styles.mainContent}>
        {/* Left Sidebar - Rooms & Contacts */}
        <aside className={`${styles.leftSidebar} ${!leftSidebarOpen ? styles.collapsed : ''}`}>
          {leftSidebarOpen && (
            <div className={styles.sidebarContent}>
              {/* Search bar */}
              <div className={styles.searchBar}>
                <input
                  type="text"
                  placeholder="Search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={styles.searchInput}
                />
              </div>

              {/* Rooms Section */}
              <div className={styles.sidebarSection}>
                <h3 className={styles.sectionTitle}>ROOMS</h3>
                <div className={styles.roomsSection}>
                  <div className={styles.categoryHeader}>▼ Public Rooms</div>
                  <div className={styles.roomList} id="room-list">
                    {loading ? (
                      <div style={{ fontSize: '0.8rem', color: '#999', padding: '0.5rem' }}>Loading...</div>
                    ) : publicRooms.length > 0 ? (
                      publicRooms.map((room) => (
                        <div
                          key={room.id}
                          onClick={() => handleRoomClick(room.id)}
                          className={styles.roomItem}
                          title={room.name}
                        >
                          {room.name}
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: '#999', padding: '0.5rem' }}>No public rooms</div>
                    )}
                  </div>
                  <div className={styles.categoryHeader}>▼ Private Rooms</div>
                  <div className={styles.roomList}>
                    {privateRooms.length > 0 ? (
                      privateRooms.map((room) => (
                        <div
                          key={room.id}
                          onClick={() => handleRoomClick(room.id)}
                          className={styles.roomItem}
                          title={room.name}
                        >
                          {room.name}
                        </div>
                      ))
                    ) : (
                      <div style={{ fontSize: '0.8rem', color: '#999', padding: '0.5rem' }}>No private rooms</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Contacts Section */}
              <div className={styles.sidebarSection}>
                <h3 className={styles.sectionTitle}>CONTACTS</h3>
                <div className={styles.contactList} id="contact-list">
                  {contacts.length > 0 ? (
                    contacts.map((contact) => (
                      <div
                        key={contact.friend_id}
                        onClick={() => navigate(`/dm/${contact.friend_id}`)}
                        className={styles.contactItem}
                        title={contact.username}
                      >
                        {contact.username}
                      </div>
                    ))
                  ) : (
                    <div style={{ fontSize: '0.8rem', color: '#999', padding: '0.5rem' }}>No contacts</div>
                  )}
                </div>
              </div>

              {/* Create Room Button */}
              <button className={styles.createRoomBtn} onClick={() => navigate('/catalog')}>
                [Create room]
              </button>
            </div>
          )}
          <button
            className={styles.toggleBtn}
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            title="Toggle sidebar"
          >
            {leftSidebarOpen ? '◀' : '▶'}
          </button>
        </aside>

        {/* Main Chat Area */}
        <main className={styles.chatArea}>
          {children}
        </main>

        {/* Right Sidebar - Room Context & Members */}
        <aside className={styles.rightSidebar}>
          <div className={styles.sidebarContent}>
            {roomInfo ? (
              <RoomPanel
                room={roomInfo}
                members={roomMembers}
                user={user}
                onInvite={() => {}}
                onManage={() => setShowManageModal(true)}
                onBan={() => {}}
                onRemove={() => {}}
                onPromote={() => {}}
                onDemote={() => {}}
              />
            ) : (
              <div style={{ padding: '1rem', color: '#999', fontSize: '0.9rem' }}>
                Select a room to view details
              </div>
            )}
          </div>
        </aside>

        {/* Manage Room Modal */}
        {showManageModal && roomInfo && (
          <ManageRoomModal
            room={roomInfo}
            members={roomMembers}
            user={user}
            presence={presence}
            onClose={() => setShowManageModal(false)}
            onMembersChanged={handleMembersChanged}
          />
        )}
      </div>
    </div>
  );
}
