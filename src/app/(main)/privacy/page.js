import LegalPage, { Section } from '@/components/ui/LegalPage';
import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy',
  description: 'What EduOrbit collects, why, and your choices.',
  alternates: { canonical: '/privacy' },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="25 November 2026">
      <Section title="1. Who is responsible">
        <p>EduOrbit is operated by Aditya Jain, India. For privacy questions or requests, use the <Link href="/contact">contact page</Link>.</p>
      </Section>
      <Section title="2. What we collect">
        <ul>
          <li><strong>Account data:</strong> email address and password (stored only as a hash by our authentication provider), or Google account name, email and avatar if you sign in with Google, or a phone number if you sign in by phone.</li>
          <li><strong>Profile data:</strong> username, display name, bio, points, badges, streak. Your username, display name, avatar, points and solved count are visible to other users, for example on the leaderboard.</li>
          <li><strong>Learning activity:</strong> code you submit and its verdicts, drafts you save, bookmarks, contest registrations and results, study-timer sessions, goals and planner items, videos you upload or report.</li>
          <li><strong>Messages:</strong> what you send through the contact form, with your name and email.</li>
          <li><strong>Technical data:</strong> standard server logs (such as IP address and request details) kept for security and troubleshooting.</li>
        </ul>
      </Section>
      <Section title="3. Why we use it">
        <p>To run your account, grade your code, rank contests, show your progress and recommendations, keep the service secure and answer your messages. We do not sell your personal data and we do not run advertising.</p>
      </Section>
      <Section title="4. Who else handles it">
        <ul>
          <li><strong>Supabase</strong> hosts our database and authentication.</li>
          <li><strong>Vercel</strong> (or the host we deploy on) serves the website and API.</li>
          <li><strong>YouTube</strong> provides video search and playback. Watching embedded videos is subject to Google&rsquo;s privacy policy.</li>
          <li><strong>Google Gemini</strong> may process the text of a video&rsquo;s title and description, or the question and context you send to the study assistant, to produce AI responses.</li>
          <li><strong>The code judge</strong> runs your submitted code in an isolated environment to grade it.</li>
        </ul>
        <p>These providers may process data outside India.</p>
      </Section>
      <Section title="5. Cookies and local storage">
        <p>We use cookies only to keep you signed in. We store your theme choice and code-editor preferences in your browser. We do not use advertising or cross-site tracking cookies.</p>
      </Section>
      <Section title="6. How long we keep it">
        <p>We keep account data while your account exists. Contact messages are kept until handled and for a reasonable period afterwards. When you delete your account, we delete your profile and the data linked to it, including your contact messages, except where we must keep something by law or for security (for example a record that an account was deleted, and videos or reports you filed, which stay without a link to you).</p>
      </Section>
      <Section title="7. Your choices">
        <p>On your <Link href="/profile">Profile page</Link> you can edit your profile details, download a copy of your personal data, and permanently delete your account. For anything else, such as correcting data you cannot edit, asking questions about your data, withdrawing consent or raising a complaint, use the <Link href="/contact">contact page</Link>.</p>
      </Section>
      <Section title="8. Security">
        <p>Data is sent over HTTPS, access to it is limited by database rules, and secrets are kept on the server. No system is perfectly secure, so please use a strong, unique password.</p>
      </Section>
      <Section title="9. Children">
        <p>EduOrbit is not directed at children under 13. If you believe a child has given us personal data, contact us and we will delete it.</p>
      </Section>
      <Section title="10. Changes">
        <p>We may update this policy. The date above shows the latest version.</p>
      </Section>
    </LegalPage>
  );
}
