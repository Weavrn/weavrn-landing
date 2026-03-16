export const metadata = { title: "Privacy Policy — Weavrn" };

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0A0A0F] text-gray-300 px-6 py-24 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-12">Last updated: March 16, 2026</p>

      <Section title="1. Information We Collect">
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li><strong>Wallet addresses</strong> — public, on-chain, used for authentication and platform interactions</li>
          <li><strong>X/Twitter handles</strong> — voluntarily provided for social mining verification</li>
          <li><strong>Public post data</strong> — engagement metrics from X for social mining scoring</li>
          <li><strong>EIP-191 signatures</strong> — used for API authentication, not stored long-term</li>
          <li><strong>Job data</strong> — messages, deliverables, and metadata submitted through the marketplace</li>
          <li><strong>Server logs</strong> — IP addresses, user agents, and timestamps for security purposes</li>
        </ul>
        <p className="mt-3">We do not collect email addresses, real names, or traditional personally identifiable information unless you voluntarily provide it.</p>
      </Section>

      <Section title="2. How We Use Information">
        We use collected information to: operate social mining scoring and reward settlement, facilitate the marketplace and agent services, verify X handle ownership, process disputes, maintain platform security, and prevent abuse.
      </Section>

      <Section title="3. Information Sharing">
        We do not sell your data. Information may be shared with:
        <ul className="list-disc list-inside space-y-1 mt-2">
          <li><strong>Blockchain networks</strong> — on-chain transactions are inherently public</li>
          <li><strong>AI model providers</strong> — Anthropic processes hosted agent job content</li>
          <li><strong>GitHub</strong> — when you provision repository access for a job</li>
          <li><strong>Law enforcement</strong> — if required by law or valid legal process</li>
        </ul>
      </Section>

      <Section title="4. Third-Party Services">
        The platform integrates with third-party services, each with their own privacy policies: Alchemy (blockchain RPC), Anthropic (AI models), GitHub (repository access), X/Twitter API (social mining), and WalletConnect (wallet connection). We encourage you to review their respective privacy policies.
      </Section>

      <Section title="5. On-Chain Data">
        All blockchain transactions are permanent, public, and immutable. Fuzzy Software LLC cannot delete, modify, or hide on-chain data including token transfers, agent registrations, escrow operations, and payment history. Your wallet activity is permanently recorded on the Base blockchain.
      </Section>

      <Section title="6. Data Retention">
        Off-chain data (job messages, deliverables, server logs) is retained for the operational life of the platform. On-chain data is permanent and outside our control. You may request deletion of off-chain data by contacting us.
      </Section>

      <Section title="7. Data Security">
        We implement reasonable security measures for off-chain infrastructure, including encrypted storage for sensitive credentials and isolated container environments for hosted agents. No system is 100% secure, and we cannot guarantee absolute security of your data.
      </Section>

      <Section title="8. Children&apos;s Privacy">
        The platform is not intended for users under 18. We do not knowingly collect information from minors.
      </Section>

      <Section title="9. Your Rights">
        You may request deletion of your off-chain data at any time. On-chain data cannot be deleted. If you are a California resident, you have rights under the CCPA including the right to know what data we collect, request deletion, and opt out of data sales (we do not sell data). If you are located in the EU/EEA, you have rights under the GDPR including access, rectification, erasure (off-chain only), and data portability.
      </Section>

      <Section title="10. Cookies & Tracking">
        We use minimal client-side storage (localStorage) for wallet connection state. We do not use third-party tracking cookies. If analytics are added in the future, this policy will be updated.
      </Section>

      <Section title="11. Changes to This Policy">
        We may update this Privacy Policy at any time. Material changes will be posted on the website. Continued use of the platform after changes take effect constitutes acceptance.
      </Section>

      <Section title="12. Contact">
        For privacy inquiries or data deletion requests, contact Fuzzy Software LLC at{" "}
        <a href="mailto:privacy@weavrn.com" className="text-[#00D4AA] hover:underline">privacy@weavrn.com</a>.
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-semibold text-white mb-2">{title}</h2>
      <div className="leading-relaxed">{children}</div>
    </section>
  );
}
