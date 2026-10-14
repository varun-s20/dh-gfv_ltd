import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/marketing/legal-page";
import { firmOfferChanges } from "@/content/shared";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: `Terms of use for this website and how offers from ${site.brand.fullName} work.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const { company, promises } = site;
  return (
    <LegalPage eyebrow="Terms" title="Terms of use and offers" updated="13 October 2026">
      <p>
        These terms apply to your use of this website and to offers we make to buy vehicles. The website is run by {company.legalName}, registered in{" "}
        {company.registeredIn} (company number {company.companyNumber}), registered office {company.registeredOffice}
        {company.vatNumber ? `, VAT number ${company.vatNumber}` : ""}.
      </p>

      <h2>Asking for an offer</h2>
      <ul>
        <li>Asking for an offer is free and doesn&apos;t oblige you to sell.</li>
        <li>
          You must be the registered keeper of the vehicle, or have the keeper&apos;s permission, and be entitled to sell it (subject to settling any
          finance).
        </li>
        <li>Please give accurate information and photos. Our offer is based on what you tell and show us.</li>
        <li>We may decline to make an offer for any vehicle.</li>
      </ul>

      <h2>Our offers</h2>
      <ul>
        <li>An offer is valid for {promises.offerValidDays} days from the date we send it, unless we say otherwise in writing.</li>
        <li>An offer becomes an agreement when you accept it and we confirm a collection. Either of us can withdraw before collection without cost.</li>
        <li>{promises.noFees ? "We don't charge you any fees." : "Any fees are shown in your offer before you accept."}</li>
        <li>
          At collection we check the vehicle against your answers and photos. We will only change the price for one of these reasons:
          <ol>
            {firmOfferChanges.map((c) => (
              <li key={c.title}>
                <strong>{c.title}:</strong> {c.body}
              </li>
            ))}
          </ol>
          If one applies, we&apos;ll show you the evidence and agree any change with you in writing before payment. If you don&apos;t agree, you can
          cancel at no cost.
        </li>
        <li>
          Payment is by bank transfer
          {promises.paidBeforeCollection ? ", and we pay before we take the vehicle away" : " on the day of collection"}. Where there is outstanding
          finance, we pay the finance company directly and pay you the balance.
        </li>
        <li>Ownership passes to us when payment is made. You remain responsible for the vehicle until then.</li>
      </ul>

      <h2>Using this website</h2>
      <ul>
        <li>Content on this site is for general information. We work hard to keep it accurate, but it isn&apos;t advice.</li>
        <li>Don&apos;t misuse the site: no attempts to break its security, scrape it or submit false information.</li>
        <li>
          Manufacturer names such as Tesla are used only to describe the vehicles we buy. We are an independent buyer and are not affiliated with any
          manufacturer.
        </li>
        <li>
          How we use your information is explained in our <Link href="/privacy">privacy notice</Link> and <Link href="/cookies">cookie policy</Link>.
        </li>
      </ul>

      <h2>Liability</h2>
      <p>
        Nothing in these terms limits liability that cannot legally be limited, including for death or personal injury caused by negligence, or for
        fraud. Your statutory rights are not affected.
      </p>

      <h2>Law</h2>
      <p>These terms are governed by the law of England and Wales. If you live elsewhere in the UK, you may also bring proceedings in your local courts.</p>
    </LegalPage>
  );
}
