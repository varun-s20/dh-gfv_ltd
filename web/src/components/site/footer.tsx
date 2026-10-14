import { cacheLife } from "next/cache";
import Link from "next/link";
import type { Route } from "next";
import { CookieSettingsButton } from "@/components/site/consent";
import { ParkedCar } from "@/components/site/parked-car";
import { Chevron, Cta, Logo, PhoneIcon, WhatsAppIcon } from "@/components/ui/primitives";
import { site, whatsappLink } from "@/lib/site";

const columns: Array<{ title: string; links: Array<{ label: string; href: Route }> }> = [
  {
    title: "Sell",
    links: [
      { label: "Sell my Tesla", href: "/sell-my-tesla" },
      { label: "Sell my electric car", href: "/sell-my-electric-car" },
      { label: "Sell my electric van", href: "/sell-my-electric-van" },
      { label: "Get my offer", href: "/quote" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "How it works", href: "/how-it-works" },
      { label: "Why sell to us", href: "/why-sell-to-us" },
      { label: "Brands we buy", href: "/brands" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

/** The copyright year, refreshed daily rather than frozen at build time. */
async function currentYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/**
 * A pearl card that lifts away at the end of every page to show the car parked
 * underneath, the way zoox.com closes its pages.
 */
export async function SiteFooter() {
  const { company, contact } = site;
  const year = await currentYear();
  return (
    <footer className="relative">
      <div className="on-pearl sheet relative z-10 rounded-b-[1.75rem] sm:rounded-b-[2.25rem]" data-nav-theme="pearl">
        <div className="container-page pt-16 pb-8 sm:pt-24">
          <div className="grid gap-14 xl:grid-cols-[1.15fr_1fr]">
            <div>
              <p className="font-display text-[clamp(1.6rem,1.2rem+1.6vw,2.6rem)] leading-[1.05] font-medium tracking-[-0.035em] wd-104">
                The specialist buyer for Teslas, electric cars <span className="text-carbon-3">and electric vans.</span>
              </p>
              <div className="mt-8 flex flex-wrap gap-2">
                <Cta href="/quote" variant="carbon">
                  Get my offer
                </Cta>
                <Cta href={whatsappLink("Hi, I'd like an offer for my vehicle.")} variant="ghost-dark" target="_blank" rel="noopener">
                  WhatsApp us
                </Cta>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 sm:gap-10">
              {columns.map((col) => (
                <div key={col.title}>
                  <p className="eyebrow text-carbon-3">{col.title}</p>
                  <ul className="mt-4 space-y-0.5">
                    {col.links.map((l) => (
                      <li key={l.href}>
                        {/* Inline, so a label that wraps on a narrow phone keeps its chevron at the end of the words. */}
                        <Link href={l.href} className="group inline-block py-1.5 text-[0.98rem] leading-snug text-carbon transition-colors hover:text-carbon-2 max-[374px]:text-[0.92rem]">
                          {l.label.split(" ").slice(0, -1).join(" ")}{" "}
                          <span className="whitespace-nowrap">
                            {l.label.split(" ").at(-1)}
                            <Chevron className="ml-2 inline-block h-[0.6rem] w-[0.3rem] align-[0.05em] transition-transform duration-300 ease-glide group-hover:translate-x-1" />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <div className="col-span-2 sm:col-span-1">
                <p className="eyebrow text-carbon-3">Talk to us</p>
                <ul className="mt-4 space-y-1 text-[0.98rem] [&_a]:inline-flex [&_a]:py-1.5">
                  <li>
                    <a href={`tel:${contact.phoneE164}`} className="inline-flex items-center gap-2.5 whitespace-nowrap tabular-nums">
                      <PhoneIcon className="text-carbon-3" />
                      {contact.phoneDisplay}
                    </a>
                  </li>
                  <li>
                    <a href={whatsappLink()} target="_blank" rel="noopener" className="inline-flex items-center gap-2.5">
                      <WhatsAppIcon className="text-carbon-3" />
                      WhatsApp
                    </a>
                  </li>
                  {contact.email ? (
                    <li>
                      <a href={`mailto:${contact.email}`} className="break-words">
                        {contact.email}
                      </a>
                    </li>
                  ) : null}
                  <li className="text-[0.88rem] leading-relaxed text-carbon-3">{contact.hours}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-16 flex flex-col gap-6 border-t border-carbon/10 pt-6 lg:flex-row lg:items-center lg:justify-between">
            <ul className="label flex flex-wrap gap-x-6 gap-y-1 text-carbon [&_a]:py-2 [&_button]:py-2">
              <li>
                <Link href="/privacy" className="chev-link">
                  Privacy <Chevron />
                </Link>
              </li>
              <li>
                <Link href="/terms" className="chev-link">
                  Terms <Chevron />
                </Link>
              </li>
              <li>
                <Link href="/cookies" className="chev-link">
                  Cookies <Chevron />
                </Link>
              </li>
              <li>
                <Link href="/credits" className="chev-link">
                  Image credits <Chevron />
                </Link>
              </li>
              <li>
                <CookieSettingsButton className="chev-link label">
                  Cookie settings <Chevron />
                </CookieSettingsButton>
              </li>
            </ul>
            <Logo className="text-carbon" />
          </div>
          <p className="mt-6 max-w-5xl text-[0.78rem] leading-relaxed text-carbon-3">
            {company.legalName}. Registered in {company.registeredIn}, company number {company.companyNumber}. Registered office: {company.registeredOffice}.
            {company.vatNumber ? ` VAT ${company.vatNumber}.` : ""}
            {company.icoNumber ? ` ICO registration ${company.icoNumber}.` : ""} Tesla, Model 3, Model Y, Model S and Model X are trade marks of Tesla, Inc. We are an
            independent buyer, not affiliated with or endorsed by any manufacturer.
          </p>
        </div>
      </div>

      {/* Revealed as the card above scrolls away: the backdrop word, the car parked in front of it on a lit
          floor, and the small print below the floor, clear of the car. */}
      <div className="footer-reveal h-[44svh] min-h-[20rem] sm:h-[64svh] sm:min-h-[26rem]" aria-hidden>
        <div className="footer-reveal-fixed h-[44svh] min-h-[20rem] overflow-hidden bg-night-950 sm:h-[64svh] sm:min-h-[26rem]">
          <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_50%_88%,rgb(239_237_232/0.07),transparent_70%)]" />
          <div className="absolute inset-x-0 bottom-[5.25rem] flex flex-col items-center sm:bottom-[4.75rem]">
            <p className="backdrop-word backdrop-word-fill text-center text-[17vw] whitespace-normal opacity-75 sm:text-[9.2vw] sm:whitespace-nowrap">
              <span className="block sm:inline">Green</span> Future
            </p>
            <div className="relative z-10 -mt-[6.5vw] w-[min(92vw,60vw_+_10rem,120svh)] sm:-mt-[3.6vw]">
              <ParkedCar />
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-0 pb-5">
            <div className="container-page flex items-end justify-between gap-6 text-[0.78rem] text-chalk-3">
              <p>
                © {year} {company.legalName}
                <br />
                All rights reserved.
              </p>
              <p className="label text-right text-chalk-2">
                <span className="whitespace-nowrap">EV specialists ·</span> <span className="whitespace-nowrap">UK wide</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
