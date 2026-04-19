import { Link } from 'react-router-dom';
import styles from './Welcome.module.css';

export default function Welcome() {
  return (
    <div className={styles.page}>
      <nav className={styles.navbar}>
        <div className={styles.navLinks}>
          <Link to="/login-form" className={styles.navLink}>Sign In</Link>
          <Link to="/register" className={styles.navLink}>Register</Link>
        </div>
      </nav>
      <main className={styles.main}>
        <div className={styles.centerContent}>
          <img src="/logo.svg" alt="Hackathon Chat" className={styles.logo} />
          <h1 className={styles.title}>Welcome to Hackathon Chat</h1>
          <p className={styles.subtitle}>Connect, collaborate, and chat in real-time</p>
        </div>
      </main>
    </div>
  );
}
