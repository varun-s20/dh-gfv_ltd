import type { Metadata } from "next";
import { Suspense } from "react";
import { Cta } from "@/components/ui/primitives";
import { site, whatsappLink } from "@/lib/site";

export const metadata: Metadata = {
  title: "Thank you",
  robots: { index: false, follow: false },
};

type Search = Promise<{ ref?: string; via?: string }>;

const VIA: Record<string, string> = { whatsapp: "on WhatsApp", email: "by email", phone: "by phone" };

async function Confirmation({ searchParams }: { searchParams: Search }) {
  const { ref: rawRef, via } = await searchParams;
  const ref = rawRef && /^GF-[A-Z0-9]{5}$/.test(rawRef) ? rawRef : null;
  const channel = VIA[via ?? ""] ?? "by email";
  const steps = [
    { title: "We review it", body: "A specialist checks your answers, photos and the market for your exact specification." },
    { title: "You get one firm offer", body: `Sent ${channel}, usually ${site.promises.quoteTurnaround}, and valid for ${site.promises.offerValidDays} days.` },
    { title: "Accept when you're ready", body: "One tap to accept. Then we arrange payment and collection." },
  ];
  return (
    <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20 [&>*]:min-w-0">
      <div className="flex flex-col items-start">
        <p className="label flex items-center gap-2.5 text-ion-deep">
          <span className="ion-dot" /> Request received
        </p>
        <h1 className="display mt-4 text-d1">
          Thank you. <em>We&apos;re on it.</em>
        </h1>
        <p className="mt-5 max-w-xl text-lead text-carbon-2">We&apos;ve sent a confirmation to your email. A specialist will reply with your firm offer {channel}.</p>
        {ref ? (
          <div className="mt-8 rounded-2xl bg-night-900 px-6 py-5 text-chalk">
            <p className="label text-chalk-3">Your reference</p>
            <p className="mt-1.5 font-mono text-[1.9rem] tracking-[0.08em]">{ref}</p>
          </div>
        ) : null}
        <div className="mt-8 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Cta
            href={whatsappLink(ref ? `Hi, my reference is ${ref}. Here are some more photos:` : "Hi, I've just sent my details for an offer.")}
            variant="carbon"
            size="lg"
            target="_blank"
            rel="noopener"
            className="max-sm:[&_.cta-inner]:w-full max-sm:[&_.cta-text]:whitespace-normal max-sm:[&_.cta-text]:text-center"
          >
            Send more photos on WhatsApp
          </Cta>
          <Cta href="/" variant="ghost-dark" size="lg" className="max-sm:[&_.cta-inner]:w-full">
            Back to home
          </Cta>
        </div>
      </div>
      <ol className="self-start overflow-hidden rounded-[1.75rem] bg-pearl-50 ring-1 ring-carbon/[0.07]">
        {steps.map((s, i) => (
          <li key={s.title} className="grid grid-cols-[2rem_1fr] gap-3 border-b border-carbon/10 p-5 sm:grid-cols-[2.5rem_1fr] sm:gap-4 sm:p-7">
            <span className="pt-1 font-mono text-[0.78rem] text-ion-deep tabular-nums">0{i + 1}</span>
            <div>
              <h2 className="font-display text-[1.25rem] font-medium tracking-[-0.02em]">{s.title}</h2>
              <p className="mt-1.5 leading-relaxed text-carbon-2">{s.body}</p>
            </div>
          </li>
        ))}
        <li className="p-5 sm:p-7">
          <p className="text-[0.88rem] text-carbon-3">Questions in the meantime?</p>
          <p className="mt-1 font-display text-[1.5rem] font-medium tabular-nums">
            <a href={`tel:${site.contact.phoneE164}`}>{site.contact.phoneDisplay}</a>
          </p>
          <p className="mt-1 text-[0.85rem] text-carbon-3">{site.contact.hours}</p>
        </li>
      </ol>
    </div>
  );
}

export default function ReceivedPage({ searchParams }: { searchParams: Search }) {
  return (
    <div className="container-page pt-6 sm:pt-10">
      <div className="on-pearl rounded-[2rem] px-4 py-10 sm:px-12 sm:py-20">
        <Suspense fallback={<div className="h-96" />}>
          <Confirmation searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
