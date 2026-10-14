"use client";

import { clsx } from "clsx";
import { Mail } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chevron, Cta, Logo, PhoneIcon, ScrollingLogo, WhatsAppIcon, Wordmark } from "@/components/ui/primitives";
import { menuPrimary, menuSecondary, navLeft, navRight, type NavItem } from "@/content/navigation";
import { getLenis, lockScroll } from "@/lib/motion";
import { site, whatsappLink } from "@/lib/site";

type NavState = "top" | "down" | "up";

/**
 * Floating navigation modelled on zoox.com. At the top of a page it's a
 * transparent three-part bar; scrolling down clips it to a single tile; any
 * upward scroll unfolds it again as a solid bar.
 */
export function SiteNav() {
  const pathname = usePathname();
  const [state, setState] = useState<NavState>("top");
  const [theme, setTheme] = useState<"night" | "pearl">("night");
  // The menu belongs to the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const burgerRef = useRef<HTMLButtonElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const lastY = useRef(0);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const y = window.scrollY;
      const delta = y - lastY.current;
      if (y < 80) setState("top");
      else if (delta > 2) setState("down");
      else if (delta < -6) setState("up");
      if (Math.abs(delta) > 2 || y < 80) lastY.current = y;
      // As on zoox.com, the collapsed tile is a little car whose wheels turn as the page scrolls,
      // forwards on the way down and back on the way up.
      navRef.current?.style.setProperty("--wheel", `${(-y * 0.56).toFixed(1)}deg`);
      // Colour the bar for whatever section sits under it.
      let next: "night" | "pearl" = "night";
      document.querySelectorAll<HTMLElement>("[data-nav-theme]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.top <= 48 && r.bottom > 48) next = el.dataset.navTheme === "pearl" ? "pearl" : "night";
      });
      setTheme(next);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  const close = useCallback(() => {
    setOpenOn(null);
    requestAnimationFrame(() => burgerRef.current?.focus({ preventScroll: true }));
  }, []);

  const toggle = () => (open ? close() : setOpenOn(pathname));

  // Page scrolling pauses while the menu is open.
  useEffect(() => {
    lockScroll(open);
    return () => lockScroll(false);
  }, [open]);

  const isCurrent = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  // The wordmark in the open bar means "home": on the home page it glides back to the top.
  const toTop = (e: React.MouseEvent) => {
    if (pathname !== "/") return;
    e.preventDefault();
    if (state === "down") return;
    const lenis = getLenis();
    if (lenis) lenis.scrollTo(0, { duration: 1.4 });
    else window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <a
        href="#main"
        className="label fixed top-3 left-3 z-[80] -translate-y-24 rounded-xl bg-pearl-50 px-4 py-3 text-carbon transition-transform focus-visible:translate-y-0"
      >
        Skip to content
      </a>
      <nav ref={navRef} className="nav nav-enter" data-state={state} data-theme={theme} aria-label="Main">
        <div className="nav-wrap">
          <div className="nav-main" onFocusCapture={() => state === "down" && setState("up")}>
            <div className="nav-shadow" aria-hidden />
            <div className="justify-self-start" data-enter style={{ "--d": 0 } as React.CSSProperties}>
              <Burger ref={burgerRef} open={open} onClick={toggle} />
            </div>

            <ul className="label hidden grid-cols-[1fr_auto_1fr] items-center gap-9 px-6 xl:grid">
              <li className="ml-auto flex items-center gap-9" data-enter style={{ "--d": 1 } as React.CSSProperties}>
                {navLeft.map((item) => (
                  <NavLink key={item.href} item={item} current={isCurrent(item.href)} />
                ))}
              </li>
              <li data-enter style={{ "--d": 2 } as React.CSSProperties}>
                <Link
                  href="/"
                  onClick={toTop}
                  aria-label={`${site.brand.fullName} home`}
                  tabIndex={state === "down" ? -1 : 0}
                  className="nav-brand relative flex px-2 py-1 after:absolute after:-inset-3"
                >
                  <Wordmark />
                </Link>
              </li>
              <li className="mr-auto flex items-center gap-9" data-enter style={{ "--d": 3 } as React.CSSProperties}>
                {navRight.map((item) => (
                  <NavLink key={item.href} item={item} current={isCurrent(item.href)} />
                ))}
              </li>
            </ul>
            <Link
              href="/"
              onClick={toTop}
              aria-label={`${site.brand.fullName} home`}
              tabIndex={state === "down" ? -1 : 0}
              className="nav-brand justify-self-center py-2 xl:hidden"
              data-enter
              style={{ "--d": 1 } as React.CSSProperties}
            >
              <Wordmark />
            </Link>

            <div className="nav-cta justify-self-end">
              <Cta href="/quote" variant={state === "top" && theme === "night" ? "chalk" : "carbon"} size="md" className="hidden sm:inline-flex">
                Get my offer
              </Cta>
              <Cta href="/quote" variant={state === "top" && theme === "night" ? "chalk" : "carbon"} size="sm" className="sm:hidden">
                Offer
              </Cta>
            </div>

            <button type="button" className="nav-tile" aria-label="Show navigation" tabIndex={state === "down" ? 0 : -1} onClick={() => setState("up")}>
              <ScrollingLogo />
            </button>
          </div>

          <div className="nav-pill" aria-hidden={state === "top"}>
            <Burger open={open} onClick={toggle} tabIndex={state === "top" ? -1 : 0} />
            <Link
              href="/"
              onClick={(e) => pathname === "/" && e.preventDefault()}
              aria-label={`${site.brand.fullName} home`}
              tabIndex={state === "top" ? -1 : 0}
              className="flex h-12 w-12 items-center justify-center"
            >
              <ScrollingLogo />
            </Link>
          </div>
        </div>
      </nav>

      <Drawer open={open} onClose={() => close()} pathname={pathname} />
    </>
  );
}

function NavLink({ item, current }: { item: NavItem; current: boolean }) {
  return (
    <Link href={item.href} className="nav-link" aria-current={current ? "page" : undefined}>
      <Chevron className="nav-link-icon" />
      {item.label}
    </Link>
  );
}

function Burger({ open, onClick, ref, tabIndex }: { open: boolean; onClick: () => void; ref?: React.Ref<HTMLButtonElement>; tabIndex?: number }) {
  return (
    <button ref={ref} type="button" className="burger" aria-expanded={open} aria-controls="site-menu" aria-label={open ? "Close menu" : "Open menu"} onClick={onClick} tabIndex={tabIndex}>
      <span className="burger-lines" aria-hidden>
        <span />
        <span />
      </span>
      <span className="burger-x" aria-hidden>
        <svg viewBox="0 0 10 10" fill="none">
          <path d="m1.2 1.6 2 2a2 2 0 0 1 0 2.8l-2 2M8.8 8.4l-2-2a2 2 0 0 1 0-2.8l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
    </button>
  );
}

function Drawer({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const focusables = () => Array.from(panel?.querySelectorAll<HTMLElement>("a[href], button:not([disabled])") ?? []);
    requestAnimationFrame(() => focusables()[0]?.focus({ preventScroll: true }));
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const list = focusables();
      const first = list[0];
      const last = list[list.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  let i = 0;
  const stagger = () => ({ "data-stagger": true, style: { "--i": i++ } as React.CSSProperties });

  return (
    <>
      <div className={clsx("drawer-scrim", !open && "pointer-events-none")} data-open={open} aria-hidden onClick={onClose} />
      <div
        ref={panelRef}
        id="site-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className="drawer on-pearl"
        data-open={open}
        inert={!open}
        data-lenis-prevent
      >
        <div className="flex items-center gap-5 px-5 pt-5" {...stagger()}>
          <button type="button" onClick={onClose} className="burger text-carbon" aria-expanded="true" aria-label="Close menu">
            <span className="burger-x" aria-hidden style={{ opacity: 1 }}>
              <svg viewBox="0 0 10 10" fill="none">
                <path d="m1.2 1.6 2 2a2 2 0 0 1 0 2.8l-2 2M8.8 8.4l-2-2a2 2 0 0 1 0-2.8l2-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </span>
          </button>
          <Link href="/" className="py-3 text-carbon">
            <Logo compact />
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pt-8 pb-5">
          <ul className="space-y-1">
            {menuPrimary.map((item) => (
              <li key={item.href} {...stagger()}>
                <Link
                  href={item.href}
                  aria-current={pathname.startsWith(item.href) ? "page" : undefined}
                  className="drawer-row group flex items-center justify-between gap-4 rounded-xl py-2.5"
                >
                  <span>
                    <span className="block font-display text-[1.6rem] leading-tight font-medium tracking-[-0.03em]">{item.label}</span>
                    <span className="mt-0.5 block text-[0.85rem] text-carbon-3">{item.detail}</span>
                  </span>
                  <span className="chip">
                    <Chevron />
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          <div className="my-7 h-px bg-carbon/10" {...stagger()} />

          <ul className="grid grid-cols-2 gap-x-6 gap-y-0.5">
            {menuSecondary.map((item) => (
              <li key={item.href} {...stagger()}>
                <Link href={item.href} className="label chev-link py-2 text-carbon-2 transition-colors hover:text-carbon">
                  {item.label}
                  <Chevron />
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-3" {...stagger()}>
          <div className="rounded-2xl border border-carbon/10 p-4">
            <p className="eyebrow text-carbon-3">Talk to a specialist</p>
            <p className="mt-1 text-[0.85rem] text-carbon-2">{site.contact.hours}</p>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <a
                href={whatsappLink("Hi, I'd like an offer for my vehicle.")}
                target="_blank"
                rel="noopener"
                className="label flex flex-col items-center gap-2 rounded-xl bg-carbon py-3 text-pearl-50 transition-transform active:scale-[0.97]"
              >
                <WhatsAppIcon />
                WhatsApp
              </a>
              <a
                href={`tel:${site.contact.phoneE164}`}
                className="label flex flex-col items-center gap-2 rounded-xl bg-pearl-200 py-3 text-carbon transition-transform active:scale-[0.97]"
              >
                <PhoneIcon />
                Call
              </a>
              {site.contact.email ? (
                <a href={`mailto:${site.contact.email}`} className="label flex flex-col items-center gap-2 rounded-xl bg-pearl-200 py-3 text-carbon transition-transform active:scale-[0.97]">
                  <Mail aria-hidden className="size-4" strokeWidth={1.6} />
                  Email
                </a>
              ) : (
                <Link href="/contact" className="label flex flex-col items-center gap-2 rounded-xl bg-pearl-200 py-3 text-carbon transition-transform active:scale-[0.97]">
                  <Mail aria-hidden className="size-4" strokeWidth={1.6} />
                  Write
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
