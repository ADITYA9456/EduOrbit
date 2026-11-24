'use client';

import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthProvider';
import { getDisplayName } from '@/lib/avatar';
import { useTheme } from '@/context/ThemeProvider';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import {
  HiLogout,
  HiMoon,
  HiSearch,
  HiShieldCheck,
  HiSun,
  HiUpload,
  HiUser
} from 'react-icons/hi';

export default function Header({ onToggleSidebar, sidebarOpen = false, menuRef }) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/home?search=${encodeURIComponent(search.trim())}`);
    }
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    signOut();
  };

  return (
    <header className="header">
      {/* Left */}
      <div className="header__left">
        <button
          ref={menuRef}
          type="button"
          className={`header__menu-btn burger ${sidebarOpen ? 'burger--open' : ''}`}
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={sidebarOpen}
          aria-controls="app-sidebar"
        >
          <span className="burger__bar" />
          <span className="burger__bar" />
          <span className="burger__bar" />
        </button>
        <Link href="/home" className="header__logo" aria-label="EduOrbit home">
          <span className="logo-mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
              <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-25 12 12)" />
            </svg>
          </span>
          <span className="header__logo-text">EduOrbit</span>
        </Link>
      </div>

      {/* Center — Search (Always visible) */}
      <div className="header__center">
        <form className="header__search" onSubmit={handleSearch}>
          <input
            className="header__search-input"
            placeholder="Search educational videos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
           
          />
          <button type="submit" className="header__search-btn" aria-label="Search">
            <HiSearch size={18} />
          </button>
        </form>
      </div>

      {/* Right */}
      <div className="header__right">
        {user && (
          <Link href="/upload" className="header__icon-btn hide-mobile" title="Upload" aria-label="Upload a video">
            <HiUpload size={20} />
          </Link>
        )}

        <button
          className="header__icon-btn"
          onClick={toggleTheme}
          title="Toggle theme"
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <HiSun size={20} /> : <HiMoon size={20} />}
        </button>

        {user ? (
          <div className="header__user-menu" ref={dropdownRef}>
            <button
              className="header__avatar-btn"
              onClick={() => setDropdownOpen((prev) => !prev)}
              aria-label="User menu"
              aria-haspopup="true"
              aria-expanded={dropdownOpen}
            >
              <Avatar user={user} profile={profile} size={32} className="header__avatar" />
            </button>

            {dropdownOpen && (
              <div className="header__dropdown">
                <div className="header__dropdown-header">
                  <div className="header__dropdown-name">{getDisplayName(user, profile)}</div>
                  <div className="header__dropdown-email">{user.email}</div>
                </div>
                <div className="header__dropdown-divider" />
                <Link href="/profile" className="header__dropdown-item" onClick={() => setDropdownOpen(false)}>
                  <HiUser size={18} /> Profile
                </Link>
                {isAdmin && (
                  <Link href="/admin" className="header__dropdown-item" onClick={() => setDropdownOpen(false)}>
                    <HiShieldCheck size={18} /> Admin Panel
                  </Link>
                )}
                <div className="header__dropdown-divider" />
                <button className="header__dropdown-item header__dropdown-item--danger" onClick={handleLogout}>
                  <HiLogout size={18} /> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="header__auth-btns">
            <Link href="/login" className="btn btn--ghost btn--sm">Login</Link>
            <Link href="/signup" className="btn btn--primary btn--sm">Get Started</Link>
          </div>
        )}
      </div>
    </header>
  );
}
