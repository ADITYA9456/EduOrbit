export const metadata = {
  title: 'Your profile',
  description: 'Your stats, streaks and submissions.',
  alternates: { canonical: '/profile' },
  robots: { index: false, follow: false },
};

export default function Layout({ children }) {
  return children;
}
