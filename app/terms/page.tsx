import { LegalPage } from "../components/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms of Service"
      title="Chessactic Terms of Service"
      effectiveDate="July 10, 2026"
      intro={[
        'Welcome to Chessactic. By creating an account or using Chessactic, you agree to these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the service.',
      ]}
      sections={[
        {
          title: "1. Eligibility",
          paragraphs: [
            "Chessactic is intended for users who are at least 13 years old.",
            "By creating an account or using the service, you represent that you are at least 13 years of age.",
          ],
        },
        {
          title: "2. Accounts",
          paragraphs: [
            "You are responsible for maintaining the security of your account and password.",
            "You are responsible for all activity that occurs under your account.",
          ],
          bullets: [
            "Share, sell, lend, or transfer your account.",
            "Impersonate another person or organization.",
            "Create additional accounts to evade restrictions or bans.",
          ],
        },
        {
          title: "3. Acceptable Use",
          paragraphs: ["You agree not to:"],
          bullets: [
            "Harass, threaten, or intimidate others.",
            "Post unlawful, defamatory, obscene, or hateful content.",
            "Spam users or send unsolicited advertisements.",
            "Upload malware or malicious software.",
            "Attempt unauthorized access to accounts, servers, or systems.",
            "Exploit bugs or vulnerabilities.",
            "Use bots, scripts, or automation to manipulate puzzles, achievements, rankings, or other Site features.",
            "Interfere with the operation, performance, or security of Chessactic.",
          ],
        },
        {
          title: "4. User Content",
          paragraphs: [
            "Users may post forum content, create clubs, send direct messages, upload images where permitted, and otherwise contribute content.",
            "You retain ownership of the content you submit.",
            "By submitting content, you grant Chessactic a non-exclusive, worldwide, royalty-free license to host, store, reproduce, display, distribute, and otherwise use your content as necessary to operate, improve, secure, and provide the service.",
            "You are responsible for ensuring you have the legal right to upload or share any content.",
          ],
        },
        {
          title: "5. Image Uploads",
          paragraphs: ["You may only upload images that you own or have permission to use.", "You may not upload content that:"],
          bullets: [
            "Infringes copyrights or trademarks.",
            "Contains illegal material.",
            "Contains malware or malicious code.",
            "Violates these Terms or the Community Guidelines.",
          ],
        },
        {
          title: "6. Moderation",
          paragraphs: [
            "We reserve the right to remove content, suspend accounts, terminate accounts, reset achievements or statistics obtained through abuse, and take other moderation actions when necessary to protect Chessactic or its community.",
            "Direct messages and other user communications are intended to be private. However, authorized administrators may review messages or other user interactions when reasonably necessary to investigate reports of abuse, harassment, spam, cheating, or other misconduct; protect the security or integrity of Chessactic; enforce these Terms or our Community Guidelines; or comply with applicable law or valid legal process.",
          ],
        },
        {
          title: "7. Intellectual Property",
          paragraphs: [
            "Unless otherwise stated, the Chessactic software, puzzles, graphics, logos, branding, design, and original content belong to Chessactic and are protected by applicable intellectual property laws.",
          ],
        },
        {
          title: "8. Service Availability",
          paragraphs: [
            'Chessactic is provided on an "AS IS" and "AS AVAILABLE" basis.',
            "We do not guarantee uninterrupted, secure, or error-free operation. Features may be added, modified, suspended, or removed at any time.",
          ],
        },
        {
          title: "9. Limitation of Liability",
          paragraphs: [
            "To the fullest extent permitted by law, Chessactic and its operators are not liable for indirect, incidental, consequential, special, exemplary, or punitive damages arising from your use of the service.",
            "If applicable law limits this disclaimer, our liability will be limited to the maximum extent permitted by law.",
          ],
        },
        {
          title: "10. Termination",
          paragraphs: [
            "We may suspend or terminate your account, with or without notice, if we believe you have violated these Terms or if doing so is necessary to protect Chessactic, its users, or our systems.",
          ],
        },
        {
          title: "11. Governing Law",
          paragraphs: [
            "These Terms are governed by the laws of the State of South Carolina, without regard to its conflict-of-law rules.",
          ],
        },
        {
          title: "12. Changes",
          paragraphs: [
            "We may update these Terms from time to time. Continued use of Chessactic after revised Terms become effective constitutes acceptance of the updated Terms.",
          ],
        },
      ]}
      contact={<span>No special contact address is listed in this document.</span>}
    />
  );
}
