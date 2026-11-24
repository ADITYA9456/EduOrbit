import { SITE_URL } from '@/lib/site';

export default function sitemap() {
  const now = new Date();
  return ['/home', '/coding', '/contests', '/leaderboard', '/shorts', '/login', '/signup', '/terms', '/privacy', '/contact'].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === '/contests' || path === '/leaderboard' ? 'daily' : 'weekly',
    priority: path === '/home' ? 1 : 0.7,
  }));
}
