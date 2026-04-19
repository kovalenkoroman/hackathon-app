import { Link } from 'react-router-dom';
import styles from './Auth.module.css';

export default function Login() {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <img src="/logo.svg" alt="Hackathon Chat" className={styles.logo} />
        <h1 className={styles.productName}>Hackathon Chat</h1>
      </div>
      <div className={styles.card}>
        <div className={styles.welcomeContent}>
          <p>Welcome to Hackathon Chat</p>
          <p className={styles.subtitle}>Connect, collaborate, and chat in real-time</p>
        </div>
        <div className={styles.authLinks}>
          <Link to="/login-form" className={styles.authButton}>Sign In</Link>
          <Link to="/register" className={styles.authButton}>Register</Link>
        </div>
      </div>
    </div>
  );
}
