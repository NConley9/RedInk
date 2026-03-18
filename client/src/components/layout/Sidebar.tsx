import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.js';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <aside className={`sidebar ${styles.sidebar}`}>
      <div className={styles.logo}>
        <span className={styles.logoMark}>✦</span>
        <span className={styles.logoText}>Red Ink</span>
      </div>

      <nav className={styles.nav}>
        <NavLink to="/" end className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
          <IconChats />
          <span>Chats</span>
        </NavLink>
        <NavLink to="/library" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
          <IconLibrary />
          <span>Library</span>
        </NavLink>
        <NavLink to="/settings" className={({ isActive }) => `${styles.navItem} ${isActive ? styles.active : ''}`}>
          <IconSettings />
          <span>Settings</span>
        </NavLink>
      </nav>

      <div className={styles.footer}>
        <button className={styles.newChatBtn} onClick={() => navigate('/?new=1')}>
          <span>+</span> New Chat
        </button>
        <button className={styles.userBtn} onClick={signOut} title="Sign out">
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url as string} alt="avatar" className={styles.avatar} />
          ) : (
            <div className={styles.avatarPlaceholder}>{(user?.email?.[0] || '?').toUpperCase()}</div>
          )}
          <span className="truncate" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {user?.user_metadata?.full_name as string || user?.email}
          </span>
        </button>
      </div>
    </aside>
  );
}

function IconChats() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;
}
function IconLibrary() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>;
}
function IconSettings() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
}
