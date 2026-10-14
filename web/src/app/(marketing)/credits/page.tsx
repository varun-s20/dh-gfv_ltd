import type { Metadata } from "next";
import { LegalPage } from "@/components/marketing/legal-page";
import { photoCredits } from "@/content/cars";
import { fleetCredits } from "@/content/fleet";

export const metadata: Metadata = {
  title: "Image credits",
  description: "Who took the photographs used on this website, and the licences they're shared under.",
  alternates: { canonical: "/credits" },
  robots: { index: false },
};

/** Every photograph's licence credit, once each. */
const credits = [...photoCredits, ...fleetCredits].filter((c, i, all) => all.findIndex((o) => o.source === c.source) === i);

export default function CreditsPage() {
  return (
    <LegalPage eyebrow="Credits" title="Image credits" updated="14 October 2026">
      <p>
        The vehicle photographs on this site come from Wikimedia Commons. We cut the vehicles out of their backgrounds, retouched them and fitted our own
        example number plates. Each one is listed here with its photographer and licence.
      </p>
      <h2>Photographs</h2>
      <ul className="[&>li]:py-1">
        {credits.map((c) => (
          <li key={c.source}>
            <a href={c.source} target="_blank" rel="noopener" className="inline-block py-1">
              {c.subject}
            </a>{" "}
            by {c.author} ({c.licence})
          </li>
        ))}
      </ul>
      <h2>Licences</h2>
      <p>
        CC BY and CC BY-SA images may be reused under the same licence with credit to the photographer. CC0 images are in the public domain. Tesla,
        Model 3, Model Y, Model S and Model X are trade marks of Tesla, Inc. Other makes and models are trade marks of their owners. We are an independent
        buyer, not affiliated with or endorsed by any manufacturer.
      </p>
    </LegalPage>
  );
}
