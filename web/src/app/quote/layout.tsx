import { LockKeyhole } from "lucide-react";
import Link from "next/link";
import { ConsentManager } from "@/components/site/consent";
import { SiteFooter } from "@/components/site/footer";
import { Logo } from "@/components/ui/primitives";
import { site } from "@/lib/site";

/**
 * The quote flow: the site's own night stage and footer, but a quiet header with
 * no main navigation, so nothing pulls attention away halfway through the form.
 */
export default function QuoteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-night-950 text-chalk">
      <header className="sticky top-0 z-40 px-3 pt-3">
        <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-4 rounded-2xl bg-night-900/80 px-4 shadow-[0_1rem_2rem_-1.5rem_rgb(0_0_0/0.8)] ring-1 ring-chalk/[0.08] backdrop-blur-xl sm:px-6">
          <Link href="/" aria-label={`${site.brand.fullName} home`} className="flex items-center gap-3 py-3 text-chalk">
            <Logo compact className="max-[374px]:[&>span:first-child]:text-[0.82rem]" />
          </Link>
          <div className="flex items-center gap-5 text-[0.9rem]">
            <span className="label hidden items-center gap-2 text-chalk-3 md:flex">
              <LockKeyhole aria-hidden className="size-3.5" strokeWidth={1.8} />
              Secure form
            </span>
            <a href={`tel:${site.contact.phoneE164}`} className="label flex-none rounded-xl bg-chalk px-3.5 py-2.5 whitespace-nowrap text-night-950 tabular-nums transition-transform active:scale-[0.97] max-[374px]:px-2.5">
              {site.contact.phoneDisplay}
            </a>
          </div>
        </div>
      </header>
      <main id="main" className="flex-1 pb-24 sm:pb-32">
        {children}
      </main>
      <SiteFooter />
      <ConsentManager />
    </div>
  );
}
