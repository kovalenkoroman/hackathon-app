import { Link } from 'react-router-dom';
import { MessageSquare, Lock, Paperclip } from 'lucide-react';
import styles from './Welcome.module.css';

const FEATURES = [
  { Icon: MessageSquare, title: 'Real-time chat', desc: 'Messages delivered instantly via WebSocket' },
  { Icon: Lock, title: 'Private rooms', desc: 'Create invite-only spaces for your team' },
  { Icon: Paperclip, title: 'File sharing', desc: 'Drop images and files right into conversations' },
];

export default function Welcome() {
  return (
    <div className={styles.page}>
      <nav className={styles.navbar}>
        <div className={styles.brand}>
          <img src="/logo.svg" alt="" className={styles.brandLogo} />
          <span className={styles.brandName}>Hackathon Chat</span>
        </div>
        <div className={styles.navLinks}>
          <Link to="/login" className={styles.navLinkGhost}>Sign in</Link>
          <Link to="/register" className={styles.navLink}>Get started</Link>
        </div>
      </nav>

      <main className={styles.main}>
        <div className={styles.hero}>
          <img src="/logo.svg" alt="Hackathon Chat" className={styles.logo} />
          <h1 className={styles.title}>
            Chat that just <span className={styles.accent}>works</span>.
          </h1>
          <p className={styles.subtitle}>
            A lightweight, real-time chat server for teams, groups, and quick conversations.
          </p>
          <div className={styles.ctaRow}>
            <Link to="/register" className={styles.primaryCta}>Create your account</Link>
            <Link to="/login" className={styles.secondaryCta}>I already have one →</Link>
          </div>
        </div>

        <div className={styles.features}>
          {FEATURES.map((f) => {
            const { Icon } = f;
            return (
              <div key={f.title} className={styles.feature}>
                <Icon size={24} strokeWidth={1.75} className={styles.featureIcon} />
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureDesc}>{f.desc}</p>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
