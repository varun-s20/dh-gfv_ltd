import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { CookieSettingsButton } from "@/components/site/consent";
import { buttonClass } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Cookie policy",
  description: "The cookies and similar storage this website uses, and how to change your choices.",
  alternates: { canonical: "/cookies" },
};

const rows: Array<[string, string, string, string]> = [
  ["gf_consent", "Essential", "Remembers your cookie choices", "6 months"],
  ["Saved quote answers (browser storage)", "Essential", "Keeps your answers on this device so you can finish later", "Until you submit, or 14 days"],
  ["Visit source (browser storage)", "Essential", "Remembers which page or advert brought you here, sent with your enquiry", "Until you close the tab"],
  ["Cloudflare Turnstile", "Essential", "Protects the quote form from bots", "Session"],
  ["_ga, _ga_*", "Analytics (consent)", "Google Analytics: counts visits and form steps", "Up to 2 years"],
  ["_gcl_au, _gcl_aw, _gcl_gb", "Advertising (consent)", "Google Ads: measures which ads lead to enquiries", "Up to 90 days"],
];

export default function CookiesPage() {
  return (
    <LegalPage eyebrow="Cookies" title="Cookie policy" updated="13 October 2026">
      <p>
        Cookies are small files a website stores on your device. We use a few that are essential to run the site. With your permission we also use
        analytics and advertising cookies from Google. Nothing optional is set until you say yes.
      </p>
      <p>
        <CookieSettingsButton className={buttonClass("dark")} />
      </p>
      <h2>What we use</h2>
      <div role="region" aria-label="Cookies we use" tabIndex={0} className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Purpose</th>
              <th>Lasts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([name, type, purpose, lasts]) => (
              <tr key={name}>
                <td className="font-mono text-[0.85rem]">{name}</td>
                <td>{type}</td>
                <td>{purpose}</td>
                <td>{lasts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h2>Changing your mind</h2>
      <p>
        Use the cookie settings button above or in the footer at any time. You can also clear cookies in your browser settings. Rejecting optional
        cookies doesn&apos;t affect your ability to get an offer.
      </p>
      <h2>Google Consent Mode</h2>
      <p>
        We use Google Consent Mode. Until you accept, Google&apos;s tags are not loaded at all. If you accept analytics or advertising cookies, Google
        tags load and respect the choices you made.
      </p>
    </LegalPage>
  );
}
