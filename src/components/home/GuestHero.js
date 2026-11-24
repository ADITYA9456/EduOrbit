import Link from 'next/link';
import './guest-home.css';

const NAV = [
  { href: '/shorts', label: 'Shorts' },
  { href: '/coding', label: 'Coding' },
  { href: '/contests', label: 'Contests' },
  { href: '/leaderboard', label: 'Leaderboard' },
];

export default function GuestHero() {
  return (
    <section className="ghero" aria-labelledby="hero-title">
      <div className="ghero__bar">
        <Link href="/home" className="ghero__brand">
          <span className="logo-mark" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
              <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(-25 12 12)" />
            </svg>
          </span>
          EduOrbit
        </Link>
        <nav className="ghero__nav" aria-label="Explore EduOrbit">
          {NAV.map((l) => (
            <Link key={l.href} href={l.href}>{l.label}</Link>
          ))}
        </nav>
      </div>

      <div className="ghero__body">
        <h1 id="hero-title" className="ghero__title">
          <span className="ghero__line"><span className="ghero__line-text ghero__line-text--1">Learn from videos</span></span>
          <span className="ghero__line"><span className="ghero__line-text ghero__line-text--2">checked first.</span></span>
        </h1>
        <p className="ghero__sub">
          Every learning video gets an AI check and admin approval before it goes live. Then put it to work with coding practice, contests, and a leaderboard.
        </p>
        <div className="ghero__actions">
          <Link href="/signup" className="ghero__btn ghero__btn--primary">Get Started</Link>
          <a href="#explore" className="ghero__btn ghero__btn--ghost">Browse videos</a>
        </div>
      </div>
    </section>
  );
}
