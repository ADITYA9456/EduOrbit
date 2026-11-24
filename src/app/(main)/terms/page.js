import LegalPage, { Section } from '@/components/ui/LegalPage';
import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service',
  description: 'The rules for using EduOrbit.',
  alternates: { canonical: '/terms' },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="25 November 2026">
      <Section title="1. Who runs EduOrbit">
        <p>EduOrbit is operated by Aditya Jain, India (&ldquo;we&rdquo;, &ldquo;us&rdquo;). By creating an account or using the site you agree to these terms. If you do not agree, do not use EduOrbit.</p>
      </Section>
      <Section title="2. Your account">
        <p>You must give accurate details and keep your sign-in credentials private. You are responsible for activity under your account. You must be old enough to enter a binding agreement where you live, or have a parent or guardian&rsquo;s permission. Tell us through the <Link href="/contact">contact page</Link> if you think your account has been misused.</p>
      </Section>
      <Section title="3. What EduOrbit offers">
        <p>EduOrbit lets you watch curated educational videos (streamed from YouTube), practise coding problems that are run and graded on our code judge, take part in timed contests, and track your learning. Features may change, be paused or be removed as the service develops.</p>
      </Section>
      <Section title="4. Acceptable use">
        <ul>
          <li>Do not attack, probe or overload the service, or try to reach data that is not yours.</li>
          <li>Do not submit code meant to escape the judge sandbox, mine cryptocurrency, send network traffic or harm other users.</li>
          <li>Do not cheat in contests: no sharing solutions during a live contest, no multiple accounts, no automated submissions.</li>
          <li>Do not upload or link content that is unlawful, abusive, misleading or not educational.</li>
          <li>Do not scrape the service or resell it without our written permission.</li>
        </ul>
        <p>We may remove content, disqualify contest results, suspend or ban accounts that break these rules.</p>
      </Section>
      <Section title="5. Your content and code">
        <p>You keep ownership of the code you write and the videos you recommend. You give us a limited licence to store, run, display and grade it so the service can work (for example, showing your submission history to you and showing contest standings). Do not submit anything you do not have the right to share.</p>
      </Section>
      <Section title="6. Third-party content">
        <p>Videos are embedded from YouTube and remain subject to YouTube&rsquo;s terms. We do not own that content and are not responsible for it. AI features (such as video checks, hints and the study assistant) may be wrong. Treat them as help, not as authoritative answers.</p>
      </Section>
      <Section title="7. No warranty">
        <p>EduOrbit is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. We do not promise it will be uninterrupted or error free, that judge verdicts will always be perfect, or that it will meet any exam or career outcome.</p>
      </Section>
      <Section title="8. Limit of liability">
        <p>To the extent the law allows, we are not liable for indirect or consequential loss, or for loss of data, profits or opportunity arising from your use of EduOrbit. Nothing in these terms limits liability that cannot be limited by law.</p>
      </Section>
      <Section title="9. Ending your use">
        <p>You may stop using EduOrbit at any time and ask us to delete your account through the <Link href="/contact">contact page</Link>. We may suspend or end access if these terms are broken or if we must by law.</p>
      </Section>
      <Section title="10. Changes">
        <p>We may update these terms. The date above shows the latest version. Continued use after a change means you accept it.</p>
      </Section>
      <Section title="11. Governing law">
        <p>These terms are governed by the laws of India. Courts in India have jurisdiction over any dispute, unless the law of your place of residence says otherwise.</p>
      </Section>
      <Section title="12. Contact">
        <p>Questions about these terms: use the <Link href="/contact">contact page</Link>. See also our <Link href="/privacy">Privacy Policy</Link>.</p>
      </Section>
    </LegalPage>
  );
}
