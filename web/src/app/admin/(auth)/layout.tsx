import { LogoMark } from "@/components/ui/primitives";

/** Sign-in frame: a night panel with the brand, a pearl panel with the form. Fully static. */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="on-light grid min-h-dvh grid-rows-[auto_1fr] bg-bone text-ink lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:grid-rows-1">
      <aside className="grain light-trails relative flex flex-col justify-between overflow-hidden px-6 py-6 text-ivory sm:px-10 lg:min-h-dvh lg:py-10">
        <div className="flex items-center gap-2.5">
          <LogoMark className="size-9 text-brass" />
          <span className="flex flex-col leading-none">
            <span className="font-display text-[1.55rem] tracking-[-0.02em]">Green Future</span>
            <span className="eyebrow mt-1 !text-[0.56rem] !tracking-[0.3em] text-sage">Buying desk</span>
          </span>
        </div>
        <div className="hidden max-w-md space-y-5 lg:block">
          <p className="eyebrow flex items-center gap-3 text-brass">
            <span aria-hidden className="h-px w-8 bg-current opacity-70" />
            Team only
          </p>
          <p className="display text-[3.4rem] leading-[0.98] [&_em]:!text-brass">
            Every seller gets a <em>firm</em> answer, fast.
          </p>
          <p className="text-[0.95rem] leading-relaxed text-ivory/70">
            Leads, offers and follow-ups for Teslas, electric cars and electric vans, in one place.
          </p>
        </div>
        <p className="hidden font-mono text-[0.7rem] tracking-[0.14em] text-sage/80 uppercase lg:block">Authorised staff only · Activity is logged</p>
      </aside>
      <main id="main" className="flex items-start justify-center px-5 py-10 sm:px-10 lg:items-center lg:py-16">
        <div className="w-full max-w-[25rem]">{children}</div>
      </main>
    </div>
  );
}
