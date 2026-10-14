import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: `How ${site.company.legalName} collects, uses and protects your personal information.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const { company, contact } = site;
  return (
    <LegalPage eyebrow="Privacy" title="Privacy notice" updated="13 October 2026">
      <p>
        This notice explains how {company.legalName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) uses your personal information when you visit this website, ask
        us for an offer, or sell us a vehicle. We are the data controller for that information.
      </p>
      <ul>
        <li>
          {company.legalName}, registered in {company.registeredIn}, company number {company.companyNumber}.
        </li>
        <li>Registered office: {company.registeredOffice}.</li>
        {company.icoNumber ? <li>Registered with the Information Commissioner&apos;s Office, number {company.icoNumber}.</li> : null}
        <li>
          Contact us about your data: {contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : "by phone"}, {contact.phoneDisplay}, or by post to our
          registered office.
        </li>
      </ul>

      <h2>What we collect</h2>
      <h3>When you ask for an offer</h3>
      <ul>
        <li>Your name, email address, phone number and postcode.</li>
        <li>How you&apos;d like us to contact you (WhatsApp, email or phone) and any notes you add.</li>
        <li>
          Details of the vehicle: registration, make, model, year, mileage, condition, damage, battery health, service history, keys, finance and
          ownership, and photos you upload.
        </li>
        <li>For business sellers, your business name and VAT information.</li>
      </ul>
      <h3>Automatically</h3>
      <ul>
        <li>
          The page you arrived on and how you found us (for example a Google ad campaign name or click ID), so we know which advertising works.
        </li>
        <li>A shortened, scrambled form of your IP address and your browser type, used to prevent spam and abuse.</li>
        <li>With your consent only, analytics and advertising cookies. See our cookie policy.</li>
      </ul>
      <h3>If you sell us a vehicle</h3>
      <ul>
        <li>The information needed to complete the purchase: identity checks, V5C details, bank details for payment, finance settlement figures.</li>
      </ul>

      <h2>How we use it, and why we&apos;re allowed to</h2>
      <table>
        <thead>
          <tr>
            <th>Purpose</th>
            <th>Lawful basis</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Preparing and sending your offer, answering your questions, arranging collection</td>
            <td>Taking steps at your request before entering into a contract, and performing that contract</td>
          </tr>
          <tr>
            <td>Buying the vehicle: payment, finance settlement, DVLA notification</td>
            <td>Contract, and legal obligations</td>
          </tr>
          <tr>
            <td>Keeping accounting and tax records</td>
            <td>Legal obligation</td>
          </tr>
          <tr>
            <td>Preventing fraud and spam, keeping the site secure, measuring which adverts bring enquiries</td>
            <td>Our legitimate interests in running a safe, efficient business</td>
          </tr>
          <tr>
            <td>Sending news and offers, if you ticked the box</td>
            <td>Consent, which you can withdraw at any time</td>
          </tr>
          <tr>
            <td>Analytics and advertising cookies</td>
            <td>Consent, given through our cookie banner</td>
          </tr>
        </tbody>
      </table>
      <p>
        Messages about your offer (confirmation, the offer itself, collection arrangements) are service messages, not marketing. We never sell your
        personal information.
      </p>

      <h2>Who we share it with</h2>
      <p>We use trusted suppliers who process information on our behalf and only on our instructions:</p>
      <ul>
        <li>Website hosting, database and secure file storage providers.</li>
        <li>Our email delivery provider, to send confirmation and offer emails.</li>
        <li>Meta (WhatsApp Business), when you choose WhatsApp.</li>
        <li>Cloudflare, to protect our forms from bots.</li>
        <li>Google, for analytics and advertising measurement, only if you accept those cookies.</li>
      </ul>
      <p>
        We also share information where needed to buy your vehicle: with your finance company to settle the agreement, with the DVLA, and with our bank
        to pay you. Some suppliers are based outside the UK; where that happens we rely on UK adequacy regulations or the UK International Data Transfer
        Agreement to protect your information.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Enquiries that don&apos;t lead to a purchase, including photos: 12 months from your last contact with us.</li>
        <li>Vehicles we buy: six years after the end of the financial year of purchase, as required for tax records.</li>
        <li>Marketing preferences: until you unsubscribe.</li>
        <li>Photos you upload but never send with an enquiry: deleted within 24 hours.</li>
      </ul>

      <h2>Your rights</h2>
      <p>
        You can ask us for a copy of your information, to correct it, to delete it, to restrict or object to how we use it, or to move it to another
        organisation. Where we rely on consent, you can withdraw it at any time. Contact us using the details above; we&apos;ll reply within one month.
      </p>
      <p>
        If you&apos;re unhappy with how we&apos;ve handled your information, please tell us first. You can also complain to the Information
        Commissioner&apos;s Office at <a href="https://ico.org.uk/make-a-complaint/">ico.org.uk</a> or on 0303 123 1113.
      </p>

      <h2>Changes</h2>
      <p>We&apos;ll update this notice when our practices change. The date at the top shows when it last changed.</p>
    </LegalPage>
  );
}
