'use client';

import Footer from '@/components/layout/Footer';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/context/AuthProvider';
import { useEffect, useRef, useState } from 'react';

// `footer` is the slim footer slot for logged-in views (filled in Run 3).
// Until then it falls back to the existing site footer.
export default function MainLayout({ children, footer }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();
  const menuRef = useRef(null);

  useEffect(() => {
    if (!sidebarOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setSidebarOpen(false);
        menuRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sidebarOpen]);

  return (
    <div className="layout">
      <Header onToggleSidebar={() => setSidebarOpen((p) => !p)} sidebarOpen={sidebarOpen} menuRef={menuRef} />
      <div className="layout__body">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className={`layout__content ${sidebarOpen ? 'layout__content--sidebar-open' : ''}`}>
          <div className="layout__inner">{children}</div>
          {user ? (
            <div className="layout__footer" data-slot="footer">{footer ?? <Footer />}</div>
          ) : (
            <div className="layout__inner"><Footer /></div>
          )}
        </main>
      </div>
    </div>
  );
}
