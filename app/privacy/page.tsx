import { LegalPage } from "../components/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy Policy"
      title="Chessactic Privacy Policy"
      effectiveDate="July 10, 2026"
      intro={[
        "This Privacy Policy explains how Chessactic collects, uses, and protects your information.",
      ]}
      sections={[
        {
          title: "Information We Collect",
          paragraphs: ["Depending on how you use Chessactic, we may collect:"],
          bullets: [
            "Username",
            "Email address",
            "Encrypted or hashed password",
            "IP address",
            "Browser and device information",
            "Cookies or similar technologies used for authentication and security",
            "Forum posts",
            "Club content",
            "Direct messages",
            "Uploaded images",
            "Puzzle statistics, achievements, gameplay information, and server logs",
          ],
        },
        {
          title: "How We Use Information",
          paragraphs: ["We use collected information to:"],
          bullets: [
            "Create and manage user accounts.",
            "Verify email addresses.",
            "Send account verification emails, password reset emails, and important security or account notices.",
            "Operate and improve Chessactic.",
            "Authenticate users.",
            "Prevent spam, abuse, cheating, fraud, and unauthorized access.",
            "Investigate violations of our Terms of Service or Community Guidelines.",
            "Respond to support requests.",
            "Maintain the security and reliability of our services.",
          ],
        },
        {
          title: "Direct Messages and User Communications",
          paragraphs: [
            "Direct messages and other communications are intended for communication between users.",
            "Authorized administrators may access or review communications when reasonably necessary to investigate abuse, harassment, spam, cheating, security incidents, violations of our Terms of Service, or to comply with applicable law or legal process.",
          ],
        },
        {
          title: "Uploaded Images",
          paragraphs: [
            "Images uploaded by users may be stored to provide the service.",
            "Administrators may review uploaded images when reasonably necessary to enforce our rules, investigate abuse, respond to legal requests, or maintain the security and integrity of Chessactic.",
          ],
        },
        {
          title: "IP Addresses",
          paragraphs: ["We collect IP addresses for purposes including:"],
          bullets: [
            "Account security.",
            "Fraud prevention.",
            "Spam detection.",
            "Abuse investigations.",
            "Compliance with applicable law.",
          ],
        },
        {
          title: "Sharing Information",
          paragraphs: ["We do not sell your personal information."],
          bullets: [
            "With service providers that help us operate Chessactic.",
            "When required by law or valid legal process.",
            "To investigate or prevent fraud, abuse, or security incidents.",
            "To protect the rights, safety, or property of Chessactic, our users, or others.",
            "In connection with a merger, acquisition, or sale of assets.",
          ],
        },
        {
          title: "Cookies",
          paragraphs: ["Chessactic uses cookies and similar technologies to:"],
          bullets: [
            "Keep users signed in.",
            "Maintain account security.",
            "Remember preferences.",
            "Improve site functionality.",
            "Disabling cookies may affect some features of the service.",
          ],
        },
        {
          title: "Data Security",
          paragraphs: [
            "We use reasonable administrative, technical, and organizational safeguards designed to protect your information. However, no method of electronic storage or internet transmission is completely secure.",
          ],
        },
        {
          title: "Children's Privacy",
          paragraphs: [
            "Chessactic is intended for users who are 13 years of age or older.",
            "We do not knowingly collect personal information from children under 13. If we become aware that we have collected such information, we will take reasonable steps to delete it.",
          ],
        },
        {
          title: "Your Choices",
          paragraphs: [
            "You may update certain account information through your account settings where available.",
            "You may request deletion of your account. We may retain certain information where reasonably necessary to comply with legal obligations, resolve disputes, prevent fraud, enforce our Terms, or protect the integrity of Chessactic.",
          ],
        },
        {
          title: "Changes to This Policy",
          paragraphs: [
            "We may update this Privacy Policy from time to time. The updated version will include a revised effective date.",
          ],
        },
        {
          title: "Contact",
          paragraphs: [
            "Questions regarding this Privacy Policy may be directed to the contact information published on Chessactic.",
          ],
        },
      ]}
      contact={<span>Questions regarding this Privacy Policy may be directed to the contact information published on Chessactic.</span>}
    />
  );
}
