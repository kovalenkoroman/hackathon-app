import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './MainLayout.module.css';

export default function MainLayout({ user, onLogout, wsState, presence, children }) {
  const navigate = useNavigate();
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);

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
      {/* Top Navigation */}
      <nav className={styles.topNav}>
        <div className={styles.navBrand}>
          <h1>💬 Chat</h1>
        </div>
        <div className={styles.navLinks}>
          <a href="/catalog">Public Rooms</a>
          <a href="/my-rooms">Private Rooms</a>
          <a href="/friends">Contacts</a>
          <a href="/sessions">Sessions</a>
          <a href="/profile">Profile</a>
        </div>
        <div className={styles.navRight}>
          <span className={styles.userInfo}>
            {user?.username} {getPresenceIcon(presence)}
          </span>
          <button onClick={onLogout} className={styles.logoutBtn}>Sign Out</button>
        </div>
      </nav>

      {/* Main Layout */}
      <div className={styles.mainContent}>
        {/* Left Sidebar */}
        <aside className={`${styles.sidebar} ${styles.leftSidebar} ${!leftSidebarOpen ? styles.collapsed : ''}`}>
          <button
            className={styles.toggleBtn}
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            title="Toggle sidebar"
          >
            {leftSidebarOpen ? '◀' : '▶'}
          </button>
          {leftSidebarOpen && (
            <div className={styles.sidebarContent}>
              <h3>Rooms</h3>
              <div className={styles.roomList} id="room-list">
                {/* Populated by child components */}
              </div>
              <h3>Contacts</h3>
              <div className={styles.contactList} id="contact-list">
                {/* Populated by child components */}
              </div>
            </div>
          )}
        </aside>

        {/* Main Chat Area */}
        <main className={styles.chatArea}>
          {children}
        </main>

        {/* Right Sidebar */}
        <aside className={`${styles.sidebar} ${styles.rightSidebar} ${!rightSidebarOpen ? styles.collapsed : ''}`}>
          <button
            className={styles.toggleBtn}
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            title="Toggle sidebar"
          >
            {rightSidebarOpen ? '▶' : '◀'}
          </button>
          {rightSidebarOpen && (
            <div className={styles.sidebarContent}>
              <div id="room-info">
                {/* Populated by room detail component */}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
