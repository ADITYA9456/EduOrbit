export default function manifest() {
  return {
    name: 'EduOrbit: Learn and Code',
    short_name: 'EduOrbit',
    description: 'Curated video lessons, coding practice, contests and streaks in one place.',
    id: '/',
    start_url: '/home',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#07090f',
    theme_color: '#07090f',
    categories: ['education'],
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
