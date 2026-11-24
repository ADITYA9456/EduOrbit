// Canonical public URL of this app. Set NEXT_PUBLIC_APP_URL in production.
// Falls back to the Vercel production hostname, then localhost. Never another app's domain.
function resolveSiteUrl() {
  const explicit = (process.env.NEXT_PUBLIC_APP_URL || '').trim();
  if (explicit) return explicit.replace(/\/+$/, '');
  const vercel = (process.env.VERCEL_PROJECT_PRODUCTION_URL || '').trim();
  if (vercel) return `https://${vercel}`.replace(/\/+$/, '');
  return 'http://localhost:3000';
}

export const SITE_URL = resolveSiteUrl();
