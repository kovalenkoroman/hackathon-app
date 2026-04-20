import styles from './PresenceDot.module.css';

const ICONS = { online: '●', afk: '◐', offline: '○' };

export default function PresenceDot({ status = 'offline', title }) {
  const resolved = ICONS[status] ? status : 'offline';
  return (
    <span
      className={`${styles.dot} ${styles[resolved]}`}
      title={title || resolved}
      aria-label={resolved}
    >
      {ICONS[resolved]}
    </span>
  );
}
