"use client";

import { clsx } from "clsx";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { LogoMark } from "@/components/ui/primitives";
import { NavList, type NavCounts } from "./nav-list";
import { Toaster } from "./toast";

/**
 * Admin frame: a fixed racing-green sidebar on desktop, an off-canvas drawer on
 * phones. Everything here is static so it lands in the shell instantly; the
 * session-dependent parts (counts, the signed-in user) arrive as slots that
 * stream in behind their own Suspense boundaries.
 */
export function AdminShell({ nav, user, menuBadge, children }: { nav: ReactNode; user: ReactNode; menuBadge?: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) requestAnimationFrame(() => menuButton.current?.focus());
  }, []);

  useEffect(() => {
    if (!open) return;
    // Visibility only flips to visible on the frame after the class change, so focus a moment later.
    const focusTimer = window.setTimeout(() => closeButton.current?.focus(), 40);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const desktop = window.matchMedia("(min-width: 64rem)");
    const onResize = () => desktop.matches && close(false);
    document.addEventListener("keydown", onKey);
    desktop.addEventListener("change", onResize);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      desktop.removeEventListener("change", onResize);
      document.body.style.overflow = overflow;
    };
  }, [open, close]);

  // Close the drawer when a link inside it is followed.
  const onAsideClick = (e: MouseEvent<HTMLElement>) => {
    if (open && (e.target as HTMLElement).closest("a")) close(false);
  };

  return (
    <div className="on-light min-h-dvh bg-ivory text-ink lg:grid lg:grid-cols-[16.5rem_minmax(0,1fr)]">
      <a
        href="#admin-main"
        className="sr-only z-[80] rounded-full bg-plate px-4 py-2 text-ink focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* Phone top bar */}
      <header className="grain sticky top-0 z-30 flex h-14 items-center gap-3 bg-field px-3 text-ivory shadow-[0_1px_0_rgb(244_239_228/0.06)] lg:hidden">
        <button
          ref={menuButton}
          type="button"
          onClick={() => setOpen(true)}
          aria-expanded={open}
          aria-controls="admin-sidebar"
          className="relative grid size-10 place-items-center rounded-full text-ivory hover:bg-white/[0.07]"
        >
          <Menu aria-hidden className="size-5" strokeWidth={1.7} />
          <span className="sr-only">Open menu</span>
          {menuBadge}
        </button>
        <Link href="/admin" className="flex items-center gap-2 rounded-md">
          <LogoMark className="size-7 text-brass" />
          <span className="font-display text-[1.3rem] leading-none tracking-[-0.02em]">Green Future</span>
          <span className="eyebrow mt-0.5 !text-[0.58rem] text-sage">Admin</span>
        </Link>
      </header>

      {/* Drawer backdrop */}
      <div
        aria-hidden
        onClick={() => close()}
        className={clsx(
          "fixed inset-0 z-40 bg-field/55 backdrop-blur-[2px] transition-opacity duration-300 lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      <aside
        id="admin-sidebar"
        aria-label="Admin"
        onClick={onAsideClick}
        data-open={open}
        className={clsx(
          "grain fixed inset-y-0 left-0 z-50 flex w-[17rem] max-w-[86vw] flex-col bg-field text-ivory",
          "transition-[transform,visibility] duration-300 ease-[var(--ease-out-quint)]",
          "max-lg:invisible max-lg:-translate-x-full max-lg:data-[open=true]:visible max-lg:data-[open=true]:translate-x-0 max-lg:data-[open=true]:shadow-[0_0_60px_rgb(0_0_0/0.45)]",
          "lg:sticky lg:top-0 lg:z-auto lg:h-dvh lg:w-auto lg:max-w-none",
        )}
      >
        <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-5">
          <Link href="/admin" className="flex items-center gap-2.5 rounded-md">
            <LogoMark className="size-8 text-brass" />
            <span className="flex flex-col leading-none">
              <span className="font-display text-[1.4rem] tracking-[-0.02em]">Green Future</span>
              <span className="eyebrow mt-1 !text-[0.56rem] !tracking-[0.3em] text-sage">Buying desk</span>
            </span>
          </Link>
          <button
            ref={closeButton}
            type="button"
            onClick={() => close()}
            className="grid size-9 place-items-center rounded-full text-ivory/80 hover:bg-white/[0.07] hover:text-ivory lg:hidden"
          >
            <X aria-hidden className="size-5" strokeWidth={1.7} />
            <span className="sr-only">Close menu</span>
          </button>
        </div>
        <div className="mx-5 h-px bg-gradient-to-r from-brass/40 via-ivory/10 to-transparent" />
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-4">
          {nav}
        </nav>
        <div className="shrink-0 border-t border-ivory/[0.08] p-3">{user}</div>
      </aside>

      <div inert={open} className="min-w-0">
        <main id="admin-main" tabIndex={-1} className="mx-auto w-full max-w-[90rem] px-4 pt-6 pb-24 outline-none sm:px-6 lg:px-10 lg:pt-10">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}

/** Live navigation: highlights the current section. Lives behind Suspense because it reads the pathname. */
export function LiveNav({ counts }: { counts: NavCounts }) {
  const pathname = usePathname();
  return <NavList pathname={pathname} counts={counts} />;
}
