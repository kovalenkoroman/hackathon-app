import { useNavigate } from 'react-router-dom';
import styles from './Home.module.css';

const QUICK_ACTIONS = [
  { icon: '🌍', title: 'Browse public rooms', desc: 'Find and join open discussions', to: '/catalog' },
  { icon: '🔒', title: 'Your private rooms', desc: 'Invite-only rooms you belong to', to: '/my-rooms' },
  { icon: '👥', title: 'Contacts', desc: 'Message your friends directly', to: '/friends' },
];

export default function Home({ user }) {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.title}>
          Welcome back{user?.username ? `, ${user.username}` : ''}.
        </h1>
        <p className={styles.subtitle}>Pick a room from the sidebar, or jump to one of these.</p>
      </div>

      <div className={styles.actions}>
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.to}
            className={styles.action}
            onClick={() => navigate(a.to)}
          >
            <div className={styles.actionIcon}>{a.icon}</div>
            <div className={styles.actionBody}>
              <div className={styles.actionTitle}>{a.title}</div>
              <div className={styles.actionDesc}>{a.desc}</div>
            </div>
            <div className={styles.actionArrow}>→</div>
          </button>
        ))}
      </div>
    </div>
  );
}
