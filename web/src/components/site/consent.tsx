"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { CtaButton } from "@/components/ui/primitives";
import { captureAttribution, readConsent, saveConsent, track, type ConsentChoice } from "@/lib/analytics/client";
import { CONSENT_COOKIE } from "@/lib/analytics/consent-script";

const OPEN_EVENT = "gf:open-cookie-settings";

/* The consent cookie is external state: read it with useSyncExternalStore so the
   server render (no card) and the first client render agree. */
const subscribe = (onChange: () => void) => {
  window.addEventListener("gf:consent", onChange);
  return () => window.removeEventListener("gf:consent", onChange);
};
const cookieSnapshot = () => document.cookie.match(new RegExp(`(?:^|; )${CONSENT_COOKIE}=([^;]+)`))?.[1] ?? "";
const serverSnapshot = () => null;

/**
 * A small pearl card in the corner (never over the registration field on a
 * phone) and a preferences sheet. Choices drive Google Consent Mode v2; nothing
 * non-essential loads until the visitor opts in.
 */
export function ConsentManager() {
  const raw = useSyncExternalStore(subscribe, cookieSnapshot, serverSnapshot);
  const [prefs, setPrefs] = useState<ConsentChoice>({ analytics: false, marketing: false });
  const dialog = useRef<HTMLDialogElement>(null);
  const visible = raw !== null && readConsent() === null;

  useEffect(() => {
    captureAttribution();
    // One delegated listener measures every call and WhatsApp link on the site.
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.dataset.tracked === "manual") return;
      const href = a.getAttribute("href") ?? "";
      const location = a.dataset.location ?? (a.closest("nav, [role=dialog]") ? "header" : a.closest("footer") ? "footer" : window.location.pathname);
      if (href.startsWith("tel:")) track("phone_click", { location });
      else if (href.startsWith("https://wa.me/")) track("whatsapp_click", { location });
    };
    document.addEventListener("click", onClick, { capture: true });
    const open = () => {
      setPrefs(readConsent() ?? { analytics: false, marketing: false });
      dialog.current?.showModal();
    };
    window.addEventListener(OPEN_EVENT, open);
    return () => {
      window.removeEventListener(OPEN_EVENT, open);
      document.removeEventListener("click", onClick, { capture: true });
    };
  }, []);

  const decide = (choice: ConsentChoice) => {
    saveConsent(choice);
    setPrefs(choice);
    dialog.current?.close();
  };

  return (
    <>
      {visible ? (
        <div
          role="region"
          aria-label="Cookie choices"
          className="consent-in on-pearl fixed inset-x-3 bottom-[5.5rem] z-[65] max-w-[23rem] rounded-2xl p-5 shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_2rem_4rem_-1rem_rgb(5_6_7/0.5)] sm:inset-x-auto sm:bottom-5 sm:left-5"
        >
          <p className="font-display text-[1.05rem] font-semibold tracking-[-0.02em]">Cookies, briefly</p>
          <p className="mt-2 text-[0.88rem] leading-relaxed text-carbon-2">
            We use essential cookies to run the site. With your OK we&apos;d also measure visits and ad results.{" "}
            <Link href="/cookies" className="text-carbon underline underline-offset-3">
              Cookie policy
            </Link>
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <CtaButton type="button" variant="carbon" size="sm" block onClick={() => decide({ analytics: true, marketing: true })}>
              Accept all
            </CtaButton>
            <CtaButton type="button" variant="ghost-dark" size="sm" block onClick={() => decide({ analytics: false, marketing: false })}>
              Reject all
            </CtaButton>
          </div>
          <button type="button" className="label mt-3 w-full text-center text-carbon-3 underline-offset-4 hover:text-carbon hover:underline" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
            Choose
          </button>
        </div>
      ) : null}

      <dialog
        ref={dialog}
        aria-labelledby="cookie-title"
        className="on-pearl m-auto w-[min(32rem,calc(100%-1.5rem))] rounded-3xl p-0 backdrop:bg-night-950/60 backdrop:backdrop-blur-[3px]"
        data-lenis-prevent
      >
        <form method="dialog" className="p-6 sm:p-8" onSubmit={(e) => e.preventDefault()}>
          <h2 id="cookie-title" className="font-display text-[1.5rem] font-semibold tracking-[-0.03em]">
            Cookie settings
          </h2>
          <p className="mt-2 text-[0.92rem] leading-relaxed text-carbon-2">Turn on what you&apos;re happy with. You can change this any time from the footer.</p>
          <div className="mt-6 divide-y divide-carbon/10 border-y border-carbon/10">
            <Toggle label="Essential" body="Security, your quote draft and this choice. Always on." checked disabled />
            <Toggle label="Analytics" body="Google Analytics, to see which pages help people." checked={prefs.analytics} onChange={(v) => setPrefs((p) => ({ ...p, analytics: v }))} />
            <Toggle label="Advertising" body="Google Ads, to measure which adverts lead to offers." checked={prefs.marketing} onChange={(v) => setPrefs((p) => ({ ...p, marketing: v }))} />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <CtaButton type="button" variant="carbon" onClick={() => decide(prefs)}>
              Save choices
            </CtaButton>
            <CtaButton type="button" variant="ghost-dark" onClick={() => decide({ analytics: true, marketing: true })}>
              Accept all
            </CtaButton>
          </div>
        </form>
      </dialog>
    </>
  );
}

function Toggle({ label, body, checked, disabled, onChange }: { label: string; body: string; checked: boolean; disabled?: boolean; onChange?: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-6 py-4">
      <span>
        <span className="block font-display font-semibold">{label}</span>
        <span className="mt-0.5 block text-[0.88rem] text-carbon-2">{body}</span>
      </span>
      <input type="checkbox" className="peer sr-only" checked={checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} />
      <span
        aria-hidden
        className="relative mt-1 h-6 w-11 shrink-0 rounded-full bg-carbon/15 transition-colors duration-200 peer-checked:bg-carbon peer-disabled:opacity-60 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ion-deep after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-pearl-50 after:shadow after:transition-transform after:duration-300 after:ease-glide peer-checked:after:translate-x-5"
      />
    </label>
  );
}

export function CookieSettingsButton({ className, children = "Cookie settings" }: { className?: string; children?: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}>
      {children}
    </button>
  );
}
