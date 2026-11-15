import { AuthProvider } from '@/context/AuthProvider';
import { ThemeProvider } from '@/context/ThemeProvider';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import './globals.css';
import './premium.css';

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

export const metadata = {
  title: 'EduOrbite — AI-Powered Learning & Coding Platform',
  description: 'Premium educational platform with AI-curated videos, coding practice, contests, and gamification.',
  keywords: ['education', 'coding', 'programming', 'AI', 'learning'],
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
