import { AuthProvider } from '@/context/AuthProvider';
import { ThemeProvider } from '@/context/ThemeProvider';
import InstallPrompt from '@/components/pwa/InstallPrompt';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import './premium.css';
import './learn.css';

export const dynamic = 'force-dynamic';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains',
});

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://eduorbit-prep.vercel.app').replace(/\/+$/, '');
const SITE_DESCRIPTION =
  'Curated video lessons, a real code judge with 20 graded problems, timed contests and a leaderboard. Learn it, then prove it in code.';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'EduOrbite: Learn from video, prove it in code', template: '%s | EduOrbite' },
  description: SITE_DESCRIPTION,
  applicationName: 'EduOrbite',
  keywords: ['coding practice', 'online judge', 'programming contests', 'video lessons', 'learn to code'],
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  openGraph: {
    type: 'website',
    siteName: 'EduOrbite',
    url: '/',
    title: 'EduOrbite: Learn from video, prove it in code',
    description: SITE_DESCRIPTION,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'EduOrbite: learn from video, prove it in code' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EduOrbite: Learn from video, prove it in code',
    description: SITE_DESCRIPTION,
    images: ['/og.png'],
  },
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }, { url: '/favicon.ico', sizes: '64x64' }],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'EduOrbite', statusBarStyle: 'black-translucent' },
};
export const viewport = {
  themeColor: '#07090f',
  colorScheme: 'dark light',
};

// Runs before first paint so the saved theme never flashes.
const themeScript = `try{var t=localStorage.getItem('eduorbite-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}`;

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      data-theme="dark"
      className={`${inter.variable} ${jetbrains.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://i.ytimg.com" crossOrigin="anonymous" />
      </head>
      <body>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <InstallPrompt />
            <Toaster
              position="bottom-right"
              toastOptions={{
                className: 'toast-custom',
                duration: 4000,
                ariaProps: { role: 'status', 'aria-live': 'polite' },
                success: { duration: 3000 },
                error: { duration: 5000 },
                style: {
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  boxShadow: 'var(--shadow-lg)',
                },
              }}
            />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
