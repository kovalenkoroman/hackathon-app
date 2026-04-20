import { useNavigate } from 'react-router-dom';
import { Globe, Lock, Users, ArrowRight } from 'lucide-react';
import styles from './Home.module.css';

const QUICK_ACTIONS = [
  { Icon: Globe, title: 'Browse public rooms', desc: 'Find and join open discussions', to: '/catalog' },
  { Icon: Lock, title: 'Your private rooms', desc: 'Invite-only rooms you belong to', to: '/my-rooms' },
  { Icon: Users, title: 'Contacts', desc: 'Message your friends directly', to: '/friends' },
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
        {QUICK_ACTIONS.map((a) => {
          const { Icon } = a;
          return (
            <button
              key={a.to}
              className={styles.action}
              onClick={() => navigate(a.to)}
            >
              <div className={styles.actionIcon}>
                <Icon size={22} strokeWidth={1.75} />
              </div>
              <div className={styles.actionBody}>
                <div className={styles.actionTitle}>{a.title}</div>
                <div className={styles.actionDesc}>{a.desc}</div>
              </div>
              <ArrowRight size={18} className={styles.actionArrow} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
