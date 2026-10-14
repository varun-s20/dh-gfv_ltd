import { clsx } from "clsx";
import { Phone } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* ------------------------------------------------------------ emphasis */

/** Render a headline where *starred* words sit back in a quieter tone. */
export function Em({ text }: { text: string }) {
  const parts = text.split(/(\*[^*]+\*)/g).filter(Boolean);
  return (
    <>
      {parts.map((part, i) => (part.startsWith("*") && part.endsWith("*") ? <em key={i}>{part.slice(1, -1)}</em> : <span key={i}>{part}</span>))}
    </>
  );
}

export const stripEm = (text: string) => text.replace(/\*/g, "");

/* ------------------------------------------------------------ icons */

/** Rounded chevron used across buttons, links and rows. */
export function Chevron({ className, direction = "right" }: { className?: string; direction?: "right" | "left" | "down" | "up" }) {
  const rotate = { right: 0, down: 90, left: 180, up: 270 }[direction];
  return (
    <svg viewBox="0 0 5 10" fill="none" aria-hidden className={className} style={rotate ? { transform: `rotate(${rotate}deg)` } : undefined}>
      <path d="M1 1.2 3.55 4a1.5 1.5 0 0 1 0 2L1 8.8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Kept for older call sites: a simple arrow glyph. */
export function Arrow({ className, direction = "right" }: { className?: string; direction?: "up-right" | "right" | "left" | "down" }) {
  const rotate = { "up-right": -45, right: 0, left: 180, down: 90 }[direction];
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden className={clsx("size-4", className)} style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="M2.5 8h10.5M9 3.5 13.5 8 9 12.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ------------------------------------------------------------ call to action */

type CtaVariant = "chalk" | "ion" | "night" | "carbon" | "ghost" | "ghost-dark";
type CtaSize = "sm" | "md" | "lg";

function CtaBody({ children }: { children: ReactNode }) {
  return (
    <span className="cta-inner">
      <span className="cta-icon cta-icon-l">
        <Chevron />
      </span>
      <span className="cta-text">{children}</span>
      <span className="cta-icon cta-icon-r">
        <Chevron />
      </span>
    </span>
  );
}

type CtaCommon = { variant?: CtaVariant; size?: CtaSize; block?: boolean; className?: string; children: ReactNode };

/** The site's primary button: the label slides across as its chevron hops sides. */
export function Cta({ href, variant = "chalk", size = "md", block, className, children, ...rest }: CtaCommon & { href: string } & Omit<ComponentProps<"a">, "href" | "children">) {
  const props = { className: clsx("cta", className), "data-variant": variant, "data-size": size, "data-block": block || undefined };
  const external = /^(https?:|tel:|mailto:)/.test(href);
  if (external) {
    return (
      <a href={href} {...props} {...rest}>
        <CtaBody>{children}</CtaBody>
      </a>
    );
  }
  return (
    <Link href={href as Route} {...props} {...(rest as object)}>
      <CtaBody>{children}</CtaBody>
    </Link>
  );
}

export function CtaButton({ variant = "chalk", size = "md", block, className, children, ...rest }: CtaCommon & Omit<ComponentProps<"button">, "children">) {
  return (
    <button className={clsx("cta", className)} data-variant={variant} data-size={size} data-block={block || undefined} {...rest}>
      <CtaBody>{children}</CtaBody>
    </button>
  );
}

/** Class recipe for places that need a plain styled control (kept for older call sites). */
export function buttonClass(variant: "gold" | "light" | "dark" | "ghost" = "light", size: "sm" | "md" | "lg" = "md", className?: string) {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-2xl label transition-[transform,background-color] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50",
    { sm: "h-10 px-4", md: "h-12 px-5", lg: "h-14 px-7" }[size],
    {
      gold: "bg-ion text-night-950 hover:bg-ion-hi",
      light: "bg-chalk text-night-950 hover:bg-white",
      dark: "bg-carbon text-pearl-50 hover:bg-night-700",
      ghost: "text-current ring-1 ring-current/20 ring-inset hover:ring-current/50",
    }[variant],
    className,
  );
}

/* ------------------------------------------------------------ number plate */

/**
 * UK number plate. Front plates are white, rear plates yellow; both carry the
 * blue UK band. Characters use Archivo pulled to its narrowest width, close to
 * the plate typeface.
 */
export function Plate({ reg, size = "md", tone = "rear", className }: { reg: string; size?: "sm" | "md" | "lg"; tone?: "front" | "rear"; className?: string }) {
  const s = {
    sm: { h: "h-7", text: "text-[0.95rem]", band: "w-3.5 text-[0.42rem]", pad: "px-2" },
    md: { h: "h-10", text: "text-[1.45rem]", band: "w-5 text-[0.5rem]", pad: "px-3" },
    lg: { h: "h-16", text: "text-[2.4rem]", band: "w-8 text-[0.7rem]", pad: "px-5" },
  }[size];
  return (
    <span
      className={clsx(
        "inline-flex items-stretch overflow-hidden rounded-[0.35rem] ring-1 ring-black/70 ring-inset",
        tone === "rear" ? "bg-[#f7c843]" : "bg-[#f6f5f1]",
        s.h,
        className,
      )}
    >
      <span className={clsx("flex flex-col items-center justify-end bg-[#1f3d8f] pb-0.5 font-display font-bold text-white", s.band)} aria-hidden>
        UK
      </span>
      <span className={clsx("flex items-center font-display leading-none font-bold tracking-[0.06em] text-black uppercase wd-62", s.text, s.pad)}>{reg}</span>
    </span>
  );
}

/* ------------------------------------------------------------ brand */

/** Square mark for very small spaces (the admin and the favicon): a charge bolt in a rounded tile. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={clsx("flex-none", className ?? "size-8")} fill="none">
      <rect x="0.75" y="0.75" width="22.5" height="22.5" rx="7" fill="currentColor" />
      <path d="M13.4 4.6 7.6 13.1h4.1l-1.2 6.3 5.9-8.6h-4.2l1.2-6.2Z" fill="var(--mark-bolt, var(--color-ion))" />
    </svg>
  );
}

/**
 * The navigation's centrepiece: the name set wide and heavy, with a small
 * descriptor centred beneath. Letter-spacing trails after the last letter, so
 * each line is pulled back by its own tracking to sit truly centred.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={clsx("wordmark inline-flex flex-col items-center font-display leading-none whitespace-nowrap uppercase", className)} aria-hidden>
      <span className="mr-[-0.06em] text-[0.8rem] font-extrabold tracking-[0.06em] wd-112 max-[374px]:text-[0.76rem] sm:mr-[-0.08em] sm:text-[1.08rem] sm:tracking-[0.08em] sm:wd-125">Green Future</span>
      <span className="mt-[0.3rem] mr-[-0.3em] text-[0.46rem] font-semibold tracking-[0.3em] opacity-60 wd-112 sm:mt-[0.34rem] sm:mr-[-0.34em] sm:text-[0.52rem] sm:tracking-[0.34em]">EV buyers · UK</span>
    </span>
  );
}

/** Horizontal wordmark for headers and documents. */
export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <span className={clsx("inline-flex items-baseline gap-2 font-display leading-none whitespace-nowrap uppercase", className)}>
      <span className="text-[0.95rem] font-extrabold tracking-[0.1em] wd-125">Green Future</span>
      {compact ? null : <span className="text-[0.6rem] font-medium tracking-[0.24em] opacity-60 wd-112">Vehicles</span>}
      <span className="sr-only"> Vehicles</span>
    </span>
  );
}

/** A tyre, a light rim and three bold spokes: bold enough that the turn reads at icon size. */
function Wheel({ cx, cy }: { cx: number; cy: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r="3.2" fill="currentColor" />
      <circle cx={cx} cy={cy} r="2.15" fill="var(--scroll-logo-glass, var(--color-pearl-50))" />
      <g className="scroll-wheel" style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {[0, 120, 240].map((a) => (
          <rect key={a} x={cx - 0.55} y={cy - 2.2} width="1.1" height="2.2" rx="0.35" transform={`rotate(${a} ${cx} ${cy})`} fill="currentColor" />
        ))}
        <circle cx={cx} cy={cy} r="0.85" fill="currentColor" />
      </g>
    </>
  );
}

/**
 * The collapsed navigation tile, after zoox.com's: a little car whose wheels
 * turn as the page scrolls. The nav sets --wheel from the scroll position.
 */
export function ScrollingLogo({ className }: { className?: string }) {
  // A Model 3 in profile: low rounded nose, raked screen, one teardrop roofline into a short ducktail.
  return (
    <svg viewBox="0 0 40 18.6" fill="none" aria-hidden className={clsx("scroll-logo h-auto w-[2.75rem]", className)}>
      <path
        d="M2.6 14.5C1.9 14.5 1.5 14 1.5 13.2V12C1.5 11.1 2 10.6 3 10.4C6 9.9 8.8 9.3 11 8.7C14.2 6.4 17.2 5.2 20.5 5.2C25.5 5.2 31.5 6.2 35.6 7.9C36.9 8.1 38 8.5 38.4 9.2C38.6 9.6 38.7 10.4 38.7 11.2V13.2C38.7 14 38.2 14.5 37.4 14.5H34.6A3.4 3.4 0 0 0 27.8 14.5H12.4A3.4 3.4 0 0 0 5.6 14.5Z"
        fill="currentColor"
      />
      <path d="M12.6 8.85C15 7.15 17.6 6.15 20.7 6.1V8.75Z" fill="var(--scroll-logo-glass, var(--color-pearl-50))" />
      <path d="M21.5 6.1C25.2 6.15 29 7 32 8.45L31.6 8.6H21.5Z" fill="var(--scroll-logo-glass, var(--color-pearl-50))" />
      <Wheel cx={9} cy={14.6} />
      <Wheel cx={31.2} cy={14.6} />
    </svg>
  );
}

/* ------------------------------------------------------------ small pieces */

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={clsx("eyebrow flex items-center gap-2.5", className)}>{children}</p>;
}

export function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={clsx("size-4", className)} fill="currentColor">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38a9.9 9.9 0 0 0 4.74 1.21h.01c5.46 0 9.9-4.45 9.9-9.91A9.84 9.84 0 0 0 12.04 2Zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.23 8.23 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23Zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.13-.15.17-.25.25-.42.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48a.92.92 0 0 0-.66.31c-.23.25-.87.85-.87 2.07 0 1.22.89 2.4 1.01 2.57.12.16 1.75 2.67 4.24 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29Z" />
    </svg>
  );
}

export function PhoneIcon({ className }: { className?: string }) {
  return <Phone aria-hidden className={clsx("size-4", className)} strokeWidth={1.6} />;
}
