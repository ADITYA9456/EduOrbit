import Link from 'next/link';

const GROUPS = [
  { title: 'Learn', links: [{ href: '/home', label: 'Home' }, { href: '/shorts', label: 'Shorts' }, { href: '/upload', label: 'Upload' }] },
  { title: 'Practice', links: [{ href: '/coding', label: 'Coding' }, { href: '/contests', label: 'Contests' }, { href: '/leaderboard', label: 'Leaderboard' }] },
  { title: 'Account', links: [{ href: '/profile', label: 'Profile' }, { href: '/login', label: 'Login' }, { href: '/signup', label: 'Sign up' }] },
  { title: 'Legal', links: [{ href: '/terms', label: 'Terms' }, { href: '/privacy', label: 'Privacy' }, { href: '/contact', label: 'Contact' }] },
];

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer__brand">
        <span className="site-footer__name">EduOrbit</span>
        <span className="site-footer__tag">Learning videos and coding practice.</span>
      </div>
      <nav className="site-footer__nav" aria-label="Footer">
        {GROUPS.map((g) => (
          <div key={g.title} className="site-footer__group">
            <h2 className="site-footer__title">{g.title}</h2>
            <ul>
              {g.links.map((l) => (
                <li key={l.href}><Link href={l.href}>{l.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <p className="site-footer__copy">© {new Date().getFullYear()} EduOrbit</p>
    </footer>
  );
}
