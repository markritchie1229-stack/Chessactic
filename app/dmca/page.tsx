import { LegalPage } from "../components/LegalPage";

export default function DmcaPage() {
  return (
    <LegalPage
      eyebrow="Copyright Policy"
      title="Chessactic Copyright (DMCA) Policy"
      effectiveDate="July 10, 2026"
      intro={[
        "Chessactic respects the intellectual property rights of others and expects its users to do the same.",
        "If you believe that content available on Chessactic infringes your copyright, you may submit a copyright infringement notification as described below.",
      ]}
      sections={[
        {
          title: "Filing a Copyright Complaint",
          paragraphs: ["A copyright notice should include:"],
          bullets: [
            "Your full name and contact information.",
            "A description of the copyrighted work you claim has been infringed.",
            "The location (URL or other identifying information) of the allegedly infringing content on Chessactic.",
            "A statement that you have a good-faith belief that the use of the material is not authorized by the copyright owner, its agent, or the law.",
            "A statement that the information in your notice is accurate and, under penalty of perjury, that you are the copyright owner or are authorized to act on the copyright owner's behalf.",
            "Your physical or electronic signature.",
            "Copyright notices should be sent to Chessactic's designated DMCA agent at the contact information published by Chessactic.",
          ],
        },
        {
          title: "Removal of Content",
          paragraphs: [
            "Upon receiving a valid copyright complaint, Chessactic may remove or disable access to the allegedly infringing material while the claim is reviewed.",
            "We may also notify the user who uploaded the content.",
          ],
        },
        {
          title: "Counter-Notification",
          paragraphs: [
            "If you believe your content was removed or disabled by mistake or misidentification, you may submit a counter-notification.",
            "A counter-notification should include:"],
          bullets: [
            "Your name and contact information.",
            "Identification of the material that was removed and where it appeared before removal.",
            "A statement, under penalty of perjury, that you have a good-faith belief the material was removed due to mistake or misidentification.",
            "A statement that you consent to the jurisdiction of the appropriate federal court for your judicial district (or, if you reside outside the United States, an appropriate U.S. judicial district where Chessactic may be found), and that you will accept service of process from the person who submitted the original copyright notice or that person's agent.",
            "Your physical or electronic signature.",
            "If we receive a valid counter-notification, we may restore the content as permitted by applicable law unless the original complainant notifies us that they have filed a court action seeking to prevent restoration.",
          ],
        },
        {
          title: "Repeat Infringers",
          paragraphs: [
            "Chessactic may suspend or permanently terminate the accounts of users who repeatedly infringe the intellectual property rights of others.",
          ],
        },
        {
          title: "Misrepresentations",
          paragraphs: [
            "Submitting knowingly false copyright complaints or counter-notifications may result in legal liability under applicable law.",
          ],
        },
        {
          title: "Questions",
          paragraphs: [
            "Questions regarding this Copyright Policy may be directed to Chessactic using the contact information published on the website.",
          ],
        },
      ]}
      contact={<span>Questions regarding this Copyright Policy may be directed to Chessactic using the contact information published on the website.</span>}
    />
  );
}
