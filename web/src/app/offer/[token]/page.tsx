import type { Metadata } from "next";
import Link from "next/link";
import { after, connection } from "next/server";
import { Suspense } from "react";
import { Cta, Logo, Plate } from "@/components/ui/primitives";
import { findQuoteByToken, markOfferViewed } from "@/lib/leads/service";
import { gbp, ukDate } from "@/lib/notify/templates";
import { site, whatsappLink } from "@/lib/site";
import { RespondPanel } from "./respond";

export const metadata: Metadata = {
  title: "Your offer",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** Server-only clock read; the view has already opted into request-time rendering. */
const isPast = (date: Date) => date.getTime() < Date.now();

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> };

export default function OfferPage(props: Props) {
  return (
    <div className="relative isolate min-h-dvh bg-night-950">
      <div aria-hidden className="spotlight pointer-events-none absolute inset-0 -z-10" />
      <header>
        <div className="container-page flex h-20 items-center justify-between">
          <Link href="/" aria-label={`${site.brand.fullName} home`} className="min-w-0">
            <span className="sm:hidden">
              <Logo compact className="max-[374px]:[&>span:first-child]:text-[0.82rem]" />
            </span>
            <span className="max-sm:hidden">
              <Logo />
            </span>
          </Link>
          <a
            href={`tel:${site.contact.phoneE164}`}
            className="label flex-none rounded-xl bg-chalk/[0.06] px-3.5 py-2.5 whitespace-nowrap text-chalk tabular-nums ring-1 ring-chalk/12 transition-colors hover:bg-chalk/[0.1] max-[374px]:px-2.5"
          >
            {site.contact.phoneDisplay}
          </a>
        </div>
      </header>
      <main id="main" className="container-page py-10 sm:py-16">
        <Suspense fallback={<div className="h-[32rem] rounded-[1.75rem] surface-night" />}>
          <OfferView {...props} />
        </Suspense>
      </main>
    </div>
  );
}

async function OfferView({ params, searchParams }: Props) {
  await connection(); // expiry depends on the current time, so always render per request
  const [{ token }, { done }] = await Promise.all([params, searchParams]);
  const found = await findQuoteByToken(token);
  if (!found) return <Gone title="We can't find that offer" body="The link may be incomplete. Check the message we sent you, or get in touch and we'll resend it." />;

  const { quote, lead } = found;
  if (quote.status === "sent") after(() => markOfferViewed(quote.id));

  const amount = gbp(quote.amountPence);
  const vehicle = `${lead.year} ${lead.make} ${lead.model}`;
  const expired = isPast(quote.validUntil) && ["sent", "viewed"].includes(quote.status);
  const first = lead.fullName.split(/\s+/)[0];

  if (quote.status === "superseded") {
    return <Gone title="This offer has been updated" body="We've sent you a newer offer for this vehicle. Please use the link in our latest message." />;
  }

  return (
    <div className="grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-24">
      <section aria-labelledby="offer-title" className="space-y-8">
        <div className="space-y-5">
          <p className="eyebrow flex items-center gap-2.5 text-chalk-2">
            <span className="ion-dot" /> Offer for {first}
          </p>
          <Plate reg={lead.registration} size="lg" tone="front" />
          <p className="text-[1.05rem] text-chalk-2">
            {vehicle} · {lead.mileage.toLocaleString("en-GB")} miles
          </p>
        </div>
        <div className="relative overflow-hidden rounded-[1.75rem] surface-night p-7 sm:p-10">
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-1/2 bg-[radial-gradient(60%_90%_at_20%_100%,rgb(157_240_196/0.1),transparent)]" />
          <p className="label relative text-chalk-3">Our firm offer</p>
          <h1 id="offer-title" className="relative mt-3 font-display text-[clamp(3.25rem,10vw,6.5rem)] leading-none font-semibold tracking-[-0.045em] text-chalk tabular-nums wd-112">
            {amount}
          </h1>
          <dl className="relative mt-8 grid gap-4 border-t hairline pt-6 text-[0.92rem] sm:grid-cols-2">
            <div>
              <dt className="text-chalk-3">Valid until</dt>
              <dd className="mt-0.5 font-medium">{ukDate(quote.validUntil)}</dd>
            </div>
            <div>
              <dt className="text-chalk-3">Fees</dt>
              <dd className="mt-0.5 font-medium">{site.promises.noFees ? "None. This is what you receive" : "See conditions"}</dd>
            </div>
          </dl>
          {quote.conditions ? <p className="relative mt-6 border-t hairline pt-5 text-[0.95rem] leading-relaxed whitespace-pre-line text-chalk-2">{quote.conditions}</p> : null}
        </div>

        {done === "accept" || quote.status === "accepted" ? (
          <Notice tone="ok" title="Offer accepted. Thank you">
            We&apos;ll be in touch shortly to arrange collection. Please have the V5C, all keys or key cards and any charging cables ready.
          </Notice>
        ) : done === "decline" || quote.status === "declined" ? (
          <Notice tone="neutral" title="You've declined this offer">
            Thanks for letting us know. If anything changes, reply to our message and we&apos;ll take another look.
          </Notice>
        ) : expired || quote.status === "expired" ? (
          <Notice tone="neutral" title="This offer has expired">
            Prices move, so offers last {site.promises.offerValidDays} days. Reply to our message and we&apos;ll send you an up-to-date figure.
          </Notice>
        ) : (
          <RespondPanel token={token} amount={amount} reg={lead.registration} />
        )}

        <p className="text-[0.9rem] leading-relaxed text-chalk-3">
          Questions first?{" "}
          <a href={whatsappLink(`Hi, it's about my offer ${lead.ref}.`)} target="_blank" rel="noopener" className="font-medium text-ion underline underline-offset-4">
            Message us on WhatsApp
          </a>{" "}
          or call{" "}
          <a href={`tel:${site.contact.phoneE164}`} className="text-chalk tabular-nums">
            {site.contact.phoneDisplay}
          </a>
          . Quote reference {lead.ref}.
        </p>
      </section>

      <aside className="space-y-3 self-start">
        {[
          ["Accept online", "One tap, then we call to agree a collection time that suits you."],
          [site.promises.paidBeforeCollection ? "Paid before we take the keys" : "Paid on collection", "By bank transfer. Outstanding finance is settled with your lender directly."],
          ["Nothing changes unless something differs", "If the vehicle matches what you told us, this is the price. Any change is shown with a photo and agreed in writing."],
        ].map(([title, body], i) => (
          <div key={title} className="grid grid-cols-[2.5rem_1fr] gap-4 rounded-[1.5rem] surface-night p-6">
            <span className="pt-1 font-mono text-[0.78rem] text-ion tabular-nums">0{i + 1}</span>
            <div>
              <h2 className="font-display text-[1.2rem] font-medium tracking-[-0.015em]">{title}</h2>
              <p className="mt-1.5 text-[0.95rem] leading-relaxed text-chalk-2">{body}</p>
            </div>
          </div>
        ))}
      </aside>
    </div>
  );
}

function Notice({ tone, title, children }: { tone: "ok" |"neutral"; title: string; children: React.ReactNode }) {
  return (
    <div role="status" className={tone === "ok" ? "rounded-2xl bg-ion/[0.08] p-5 ring-1 ring-ion/30" : "rounded-2xl bg-chalk/[0.04] p-5 ring-1 ring-chalk/10"}>
      <p className="flex items-center gap-2.5 font-display font-medium">
        {tone === "ok" ? <span className="ion-dot" /> : null}
        {title}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-chalk-2">{children}</p>
    </div>
  );
}

function Gone({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 text-center">
      <h1 className="display text-d2">{title}</h1>
      <p className="text-chalk-2">{body}</p>
      <Cta href={whatsappLink("Hi, I need help with my offer link.")} target="_blank" rel="noopener" size="lg">
        Message us on WhatsApp
      </Cta>
    </div>
  );
}
