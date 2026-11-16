const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://eduorbit-prep.vercel.app').replace(/\/+$/, '');

export default function sitemap() {
  const now = new Date();
  return ['/home', '/coding', '/contests', '/leaderboard', '/practice', '/shorts', '/login', '/signup'].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '/contests' || path === '/leaderboard' ? 'daily' : 'weekly',
    priority: path === '/home' ? 1 : 0.7,
  }));
}
