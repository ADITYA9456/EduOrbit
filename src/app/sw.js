import {
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
  NetworkOnly,
  Serwist,
  StaleWhileRevalidate,
} from 'serwist';

const OFFLINE_URL = '/offline';

// Pages that render user-specific UI, and anything auth related, are never stored.
const PRIVATE_PAGES = /^\/(profile|upload|admin|login|signup)(\/|$)/;

const dropRedirects = {
  cacheWillUpdate: async ({ response }) =>
    response && response.status === 200 && !response.redirected ? response : null,
};

const sameOrigin = (url) => url.origin === self.location.origin;

const runtimeCaching = [
  // Auth, API routes and Supabase: always hit the network, never write to a cache.
  {
    matcher: ({ url }) => url.hostname.endsWith('.supabase.co'),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ url }) => sameOrigin(url) && url.pathname.startsWith('/api/'),
    handler: new NetworkOnly(),
  },
  {
    matcher: ({ request, url }) =>
      request.mode === 'navigate' && sameOrigin(url) && PRIVATE_PAGES.test(url.pathname),
    handler: new NetworkOnly(),
  },
  // Public HTML: network first, last good copy only when offline.
  {
    matcher: ({ request, url }) => request.mode === 'navigate' && sameOrigin(url),
    handler: new NetworkFirst({
      cacheName: 'pages',
      networkTimeoutSeconds: 4,
      plugins: [dropRedirects, new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 7 * 24 * 3600 })],
    }),
  },
  {
    matcher: ({ request, url }) => sameOrigin(url) && request.destination === 'font',
    handler: new CacheFirst({
      cacheName: 'fonts',
      plugins: [new ExpirationPlugin({ maxEntries: 8, maxAgeSeconds: 365 * 24 * 3600 })],
    }),
  },
  {
    matcher: ({ request, url }) =>
      sameOrigin(url) && (request.destination === 'image' || url.pathname.startsWith('/_next/image')),
    handler: new StaleWhileRevalidate({
      cacheName: 'images',
      plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 3600 })],
    }),
  },
];

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: OFFLINE_URL,
        matcher: ({ request }) => request.destination === 'document',
      },
    ],
  },
});

serwist.addEventListeners();
