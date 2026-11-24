// Monaco loads its workers from blob: URLs and the editor/loader from jsDelivr. Next.js needs inline
// scripts/styles; dev mode additionally needs eval for hot reload.
const isDev = process.env.NODE_ENV !== 'production';
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net${isDev ? " 'unsafe-eval'" : ''}`,
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com",
  "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com",
  "img-src 'self' data: blob: https://i.ytimg.com https://img.youtube.com https://yt3.ggpht.com https://*.googleusercontent.com https://*.supabase.co",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://cdn.jsdelivr.net",
  'frame-src https://www.youtube.com https://www.youtube-nocookie.com',
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'img.youtube.com' },
      { protocol: 'https', hostname: 'yt3.ggpht.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: '*.supabase.co' },
    ],
  },
  // Strip console.log in production builds
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false,
  },
  async redirects() {
    return [{ source: '/practice', destination: '/coding', permanent: true }];
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: contentSecurityPolicy },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
};

// Validate required env vars at build time
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
];

requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    console.warn(`⚠ Missing required env var: ${key} — the app won't work without it.`);
  }
});

// @serwist/next is ESM-only, so load it lazily from this CommonJS config.
module.exports = async () => {
  const { default: withSerwistInit } = await import('@serwist/next');
  const withSerwist = withSerwistInit({
    swSrc: 'src/app/sw.js',
    swDest: 'public/sw.js',
    disable: process.env.NODE_ENV === 'development',
    cacheOnNavigation: false,
    reloadOnOnline: false,
    additionalPrecacheEntries: [{ url: '/offline', revision: process.env.VERCEL_GIT_COMMIT_SHA || String(Date.now()) }],
  });
  return withSerwist(nextConfig);
};
