'use client';

import { useAuth } from '@/context/AuthProvider';
import { getSecondApp } from '@/lib/external-apps';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  HiChartBar,
  HiCode,
  HiExternalLink,
  HiHome,
  HiPlay,
  HiShieldCheck,
  HiUpload,
  HiUser,
  HiX
} from 'react-icons/hi';
import { HiTrophy } from 'react-icons/hi2';

const NAV_ITEMS = [
  { section: 'Main', links: [
    { href: '/home', label: 'Home', icon: HiHome },
    { href: '/shorts', label: 'Shorts', icon: HiPlay },
    { href: '/coding', label: 'Coding Practice', icon: HiCode },
    { href: '/contests', label: 'Contests', icon: HiTrophy },
    { href: '/leaderboard', label: 'Leaderboard', icon: HiChartBar },
  ]},
  { section: 'You', links: [
    { href: '/profile', label: 'Profile', icon: HiUser, auth: true },
    { href: '/upload', label: 'Upload Video', icon: HiUpload, auth: true },
  ]},
];

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();
  const { user, isAdmin } = useAuth();
  const asideRef = useRef(null);
  const secondApp = getSecondApp();
  const [iconFailed, setIconFailed] = useState(false);

  // Move focus into the sidebar when it opens so keyboard users land on its links
  useEffect(() => {
    if (!open) return;
    const items = asideRef.current?.querySelectorAll('a[href], button');
    const first = items && Array.from(items).find((el) => el.offsetParent !== null);
    first?.focus();
  }, [open]);

  // Only close sidebar on mobile (overlay mode), not on desktop
  const handleLinkClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      onClose();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="sidebar__overlay" onClick={onClose} aria-hidden="true" />}

      <aside id="app-sidebar" ref={asideRef} className={`sidebar ${open ? 'sidebar--open' : ''}`}>
        {/* Mobile close header */}
        <div className="sidebar__header">
          <div className="sidebar__title">
            <span className="logo-mark" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
                <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-25 12 12)" />
              </svg>
            </span> EduOrbite
          </div>
          <button className="sidebar__close-btn" onClick={onClose} aria-label="Close sidebar">
            <HiX size={20} />
          </button>
        </div>

        <nav className="sidebar__nav" aria-label="Primary">
          {NAV_ITEMS.map(({ section, links }) => (
            <div key={section} className="sidebar__section">
              <div className="sidebar__section-title">{section}</div>
              {links.map(({ href, label, icon: Icon, auth: requiresAuth }) => {
                if (requiresAuth && !user) return null;
                const isActive = pathname === href || (href !== '/home' && pathname.startsWith(href));
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
                    onClick={handleLinkClick}
                    aria-current={isActive ? 'page' : undefined}
                    title={label}
                  >
                    <Icon size={20} className="sidebar__link-icon" />
                    <span className="sidebar__link-text">{label}</span>
                  </Link>
                );
              })}
            </div>
          ))}

          {isAdmin && (
            <div className="sidebar__section">
              <div className="sidebar__section-title">Admin</div>
              <Link
                href="/admin"
                className={`sidebar__link ${pathname === '/admin' ? 'sidebar__link--active' : ''}`}
                onClick={handleLinkClick}
                aria-current={pathname.startsWith('/admin') ? 'page' : undefined}
                title="Admin Panel"
              >
                <HiShieldCheck size={20} className="sidebar__link-icon" />
                <span className="sidebar__link-text">Admin Panel</span>
              </Link>
            </div>
          )}

          {secondApp && (
            <div className="sidebar__section">
              <div className="sidebar__section-title">More</div>
              <a
                href={secondApp.url}
                className="sidebar__link"
                target="_blank"
                rel="noopener noreferrer"
                title={`${secondApp.name} (opens in a new tab)`}
              >
                {iconFailed ? (
                  <HiExternalLink size={20} className="sidebar__link-icon" aria-hidden="true" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={secondApp.iconUrl}
                    alt=""
                    width={20}
                    height={20}
                    className="sidebar__link-icon"
                    style={{ borderRadius: 4, objectFit: 'contain' }}
                    onError={() => setIconFailed(true)}
                  />
                )}
                <span className="sidebar__link-text">{secondApp.name}</span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </div>
          )}
        </nav>

        <div className="sidebar__footer">
          <p className="sidebar__footer-text">© {new Date().getFullYear()} EduOrbite</p>
          <p className="sidebar__footer-text">AI-Powered Learning</p>
        </div>
      </aside>
    </>
  );
}
