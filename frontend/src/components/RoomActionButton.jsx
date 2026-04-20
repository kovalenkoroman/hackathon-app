import { LogIn, LogOut, UserPlus } from 'lucide-react';

const CONFIG = {
  enter: { Icon: LogIn, label: 'Enter' },
  leave: { Icon: LogOut, label: 'Leave' },
  join: { Icon: UserPlus, label: 'Join room' },
};

export default function RoomActionButton({ action, onClick, className }) {
  const { Icon, label } = CONFIG[action];
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}
