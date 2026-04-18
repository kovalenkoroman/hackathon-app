import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './MainLayout.module.css';

export default function MainLayout({ user, onLogout, wsState, presence, children }) {
  const navigate = useNavigate();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
                  <div className={styles.categoryHeader}>▶ Public Rooms</div>
                  <div className={styles.roomList} id="room-list">
                    {/* Populated by child components */}
                  </div>
                  <div className={styles.categoryHeader}>▶ Private Rooms</div>
                </div>
              </div>

              {/* Contacts Section */}
              <div className={styles.sidebarSection}>
                <h3 className={styles.sectionTitle}>CONTACTS</h3>
                <div className={styles.contactList} id="contact-list">
                  {/* Populated by child components */}
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
        <aside className={`${styles.rightSidebar} ${!rightSidebarOpen ? styles.collapsed : ''}`}>
          {rightSidebarOpen && (
            <div className={styles.sidebarContent}>
              <div id="room-info">
                {/* Populated by room detail component */}
              </div>
            </div>
          )}
          <button
            className={styles.toggleBtn}
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            title="Toggle sidebar"
          >
            {rightSidebarOpen ? '▶' : '◀'}
          </button>
        </aside>
      </div>
    </div>
  );
}
