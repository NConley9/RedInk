import { Sidebar } from './Sidebar.js';
import { BottomNav } from './BottomNav.js';
import styles from './AppLayout.module.css';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className={`main-content ${styles.main}`}>
        <div className={`page-enter ${styles.pageContent}`}>
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
