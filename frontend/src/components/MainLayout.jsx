import { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation, matchPath } from 'react-router-dom';
import RoomPanel from './RoomPanel';
import ManageRoomModal from './ManageRoomModal';
import { RoomContext } from '../RoomContext';
import * as roomsApi from '../api/rooms';
import * as friendsApi from '../api/friends';
import { useUnreads } from '../hooks/useUnreads';
import styles from './MainLayout.module.css';

export default function MainLayout({ user, onLogout, wsState, presence, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const activeRoomMatch = matchPath('/rooms/:roomId', location.pathname) || matchPath('/rooms/:roomId/*', location.pathname);
  const activeDmMatch = matchPath('/dm/:userId', location.pathname);
  const activeRoomId = activeRoomMatch ? parseInt(activeRoomMatch.params.roomId) : null;
  const activeDmUserId = activeDmMatch ? parseInt(activeDmMatch.params.userId) : null;

  // Req 4.1.1: "After entering a room, the room list becomes compacted."
  // Collapse the list the user just navigated *from* — once you're in a room,
  // the rooms list is less relevant, and symmetrically for DMs with contacts.
  useEffect(() => {
    if (activeRoomId) setRoomsOpen(false);
    else if (activeDmUserId) setContactsOpen(false);
  }, [activeRoomId, activeDmUserId]);
  const { roomInfo, roomMembers, setRoomInfo, setRoomMembers } = useContext(RoomContext);
  const { getUnreadCount } = useUnreads();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [roomsOpen, setRoomsOpen] = useState(true);
  const [contactsOpen, setContactsOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [publicRooms, setPublicRooms] = useState([]);
  const [privateRooms, setPrivateRooms] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [contactPresence, setContactPresence] = useState({});
  const [loading, setLoading] = useState(true);
  const [showManageModal, setShowManageModal] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      // Fetch only user's rooms (rooms the user is a member of or owns)
      const userRoomsRes = await fetch('/api/v1/rooms/mine', { credentials: 'include' });
      if (userRoomsRes.ok) {
        const userRoomsData = await userRoomsRes.json();
        const allUserRooms = userRoomsData.data || [];

        // Separate into public and private
        const publicUserRooms = allUserRooms.filter(room => room.visibility === 'public');
        const privateUserRooms = allUserRooms.filter(room => room.visibility === 'private');

        setPublicRooms(publicUserRooms);
        setPrivateRooms(privateUserRooms);
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
          <img src="/logo.svg" alt="Hackathon Chat" className={styles.logo} />
          Hackathon Chat
        </div>
        <div className={styles.navLinks}>
          <a href="/catalog">Public Rooms</a>
          <a href="/my-rooms">Private Rooms</a>
          <a href="/friends">Contacts</a>
          <a href="/sessions">Sessions</a>
        </div>
        <div className={styles.navRight}>
          <div className={styles.profileDropdown}>
            <button
              className={styles.profileBtn}
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            >
              Profile ▼
            </button>
            {profileDropdownOpen && (
              <div className={styles.dropdownMenu}>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate('/sessions');
                  }}
                >
                  Sessions
                </button>
                <button
                  type="button"
                  className={styles.dropdownItem}
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate('/change-password');
                  }}
                >
                  Change password
                </button>
                <button
                  type="button"
                  className={`${styles.dropdownItem} ${styles.dropdownDanger}`}
                  onClick={() => {
                    setProfileDropdownOpen(false);
                    navigate('/delete-account');
                  }}
                >
                  Delete account…
                </button>
              </div>
            )}
          </div>
          <button onClick={onLogout} className={styles.logoutBtn}>Sign out</button>
        </div>
      </nav>

      {/* Main Layout - 3 columns */}
      <div className={styles.mainContent}>
        {/* Left Sidebar - Rooms & Contacts */}
        <aside className={`${styles.leftSidebar} ${!leftSidebarOpen ? styles.collapsed : ''}`}>
          <button
            className={styles.toggleBtn}
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            title={leftSidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            {leftSidebarOpen ? '◀' : '▶'}
          </button>
          {leftSidebarOpen && (() => {
            const q = searchQuery.trim().toLowerCase();
            const filterByName = (item) => !q || item.name?.toLowerCase().includes(q);
            const filterByUsername = (item) => !q || item.username?.toLowerCase().includes(q);
            const filteredPublic = publicRooms.filter(filterByName);
            const filteredPrivate = privateRooms.filter(filterByName);
            const filteredContacts = contacts.filter(filterByUsername);

            return (
              <div className={styles.sidebarContent}>
                <div className={styles.searchBar}>
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={styles.searchInput}
                  />
                </div>

                <div className={styles.sidebarSection}>
                  <button
                    type="button"
                    className={styles.sectionToggle}
                    onClick={() => setRoomsOpen((v) => !v)}
                  >
                    <span className={styles.chevron}>{roomsOpen ? '▾' : '▸'}</span>
                    <span className={styles.sectionTitle}>Rooms</span>
                    {!roomsOpen && filteredPublic.length + filteredPrivate.length > 0 && (
                      <span className={styles.sectionCount}>{filteredPublic.length + filteredPrivate.length}</span>
                    )}
                  </button>
                  {roomsOpen && (
                    <div className={styles.roomsSection}>
                      <div className={styles.categoryHeader}>Public</div>
                      <div className={styles.roomList} id="room-list">
                        {loading ? (
                          <div className={styles.mutedNote}>Loading...</div>
                        ) : filteredPublic.length > 0 ? (
                          filteredPublic.map((room) => {
                            const unreadCount = getUnreadCount(room.id, 'room');
                            const isActive = activeRoomId === room.id;
                            return (
                              <div
                                key={room.id}
                                onClick={() => handleRoomClick(room.id)}
                                className={`${styles.roomItem} ${isActive ? styles.active : ''}`}
                                title={room.name}
                              >
                                <span className={styles.itemName}>{room.name}</span>
                                {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount}</span>}
                              </div>
                            );
                          })
                        ) : (
                          <div className={styles.mutedNote}>{q ? 'No matches' : 'No public rooms'}</div>
                        )}
                      </div>
                      <div className={styles.categoryHeader}>Private</div>
                      <div className={styles.roomList}>
                        {filteredPrivate.length > 0 ? (
                          filteredPrivate.map((room) => {
                            const unreadCount = getUnreadCount(room.id, 'room');
                            const isActive = activeRoomId === room.id;
                            return (
                              <div
                                key={room.id}
                                onClick={() => handleRoomClick(room.id)}
                                className={`${styles.roomItem} ${isActive ? styles.active : ''}`}
                                title={room.name}
                              >
                                <span className={styles.itemName}>{room.name}</span>
                                {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount}</span>}
                              </div>
                            );
                          })
                        ) : (
                          <div className={styles.mutedNote}>{q ? 'No matches' : 'No private rooms'}</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.sidebarSection}>
                  <button
                    type="button"
                    className={styles.sectionToggle}
                    onClick={() => setContactsOpen((v) => !v)}
                  >
                    <span className={styles.chevron}>{contactsOpen ? '▾' : '▸'}</span>
                    <span className={styles.sectionTitle}>Contacts</span>
                    {!contactsOpen && filteredContacts.length > 0 && (
                      <span className={styles.sectionCount}>{filteredContacts.length}</span>
                    )}
                  </button>
                  {contactsOpen && (
                    <div className={styles.contactList} id="contact-list">
                      {filteredContacts.length > 0 ? (
                        filteredContacts.map((contact) => {
                          const contactId = contact.friend_id || contact.id;
                          const contactStatus = presence[contactId] || 'offline';
                          const unreadCount = getUnreadCount(contactId, 'dialog');
                          const isActive = activeDmUserId === contactId;
                          return (
                            <div
                              key={contactId}
                              onClick={() => navigate(`/dm/${contactId}`)}
                              className={`${styles.contactItem} ${isActive ? styles.active : ''}`}
                              title={contact.username}
                            >
                              <span className={styles.presenceDot}>{getPresenceIcon(contactStatus)}</span>
                              <span className={styles.itemName}>{contact.username}</span>
                              {unreadCount > 0 && <span className={styles.unreadBadge}>{unreadCount}</span>}
                            </div>
                          );
                        })
                      ) : (
                        <div className={styles.mutedNote}>{q ? 'No matches' : 'No contacts'}</div>
                      )}
                    </div>
                  )}
                </div>

                <button className={styles.createRoomBtn} onClick={() => navigate('/catalog?create=true')}>
                  Create room
                </button>
              </div>
            );
          })()}
        </aside>

        {/* Main Chat Area */}
        <main className={styles.chatArea}>
          {children}
        </main>

        {/* Right Sidebar - Room Context & Members */}
        {roomInfo && (
          <aside className={styles.rightSidebar}>
            <div className={styles.sidebarContent}>
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
                onLeave={() => navigate('/')}
              />
            </div>
          </aside>
        )}

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
