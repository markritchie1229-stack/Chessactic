import { LegalPage } from "../components/LegalPage";

export default function CommunityGuidelinesPage() {
  return (
    <LegalPage
      eyebrow="Community Guidelines"
      title="Chessactic Community Guidelines"
      effectiveDate="July 10, 2026"
      intro={[
        "Chessactic is a place to enjoy chess, solve puzzles, participate in discussions, and build a respectful community.",
      ]}
      sections={[
        {
          title: "Be Respectful",
          paragraphs: ["Treat other members with respect.", "Do not:"],
          bullets: [
            "Harass or bully others.",
            "Threaten violence.",
            "Engage in hate speech or discriminatory behavior.",
            "Impersonate another person or staff member.",
          ],
        },
        {
          title: "Keep Content Appropriate",
          paragraphs: ["Do not post or upload:"],
          bullets: [
            "Illegal content.",
            "Sexually explicit material.",
            "Graphic violence.",
            "Malware or harmful files.",
            "Copyrighted content you do not have permission to use.",
            "Spam or excessive advertising.",
          ],
        },
        {
          title: "Forums and Clubs",
          paragraphs: [
            "Stay on topic.",
            "Do not flood discussions, repeatedly post the same content, or disrupt conversations.",
          ],
        },
        {
          title: "Direct Messages",
          paragraphs: [
            "Respect other users' privacy.",
            "Do not use direct messages to harass, scam, threaten, or spam other members.",
          ],
        },
        {
          title: "Fair Play",
          paragraphs: ["Do not:"],
          bullets: [
            "Exploit bugs or vulnerabilities.",
            "Use bots or automation to manipulate puzzles, achievements, or rankings.",
            "Attempt to interfere with Chessactic's systems.",
            "If you discover a bug, please report it instead of exploiting it.",
          ],
        },
        {
          title: "Reporting",
          paragraphs: [
            "If you encounter abusive behavior or content that violates these Guidelines, please report it to Chessactic's moderation team.",
          ],
        },
        {
          title: "Enforcement",
          paragraphs: [
            "Violations may result in warnings, content removal, temporary suspensions, permanent account termination, or other actions we determine are appropriate to protect the community.",
          ],
        },
      ]}
      contact={<span>No special contact address is listed in this document.</span>}
    />
  );
}
