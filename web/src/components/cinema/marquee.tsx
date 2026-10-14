"use client";

import { clsx } from "clsx";
import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";

/**
 * Rows of giant names sliding past in opposite directions. Scrolling the page
 * pushes them faster, as on lucidmotors.com's model strip.
 */
export function Marquee({ rows, tone = "night" }: { rows: string[][]; tone?: "night" | "pearl" }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const tracks = Array.from(el.querySelectorAll<HTMLElement>("[data-track]"));
    const tweens = tracks.map((t, i) =>
      gsap.fromTo(t, { xPercent: i % 2 ? -50 : 0 }, { xPercent: i % 2 ? 0 : -50, duration: 38 + i * 6, ease: "none", repeat: -1 }),
    );
    let boost = 0;
    const onScroll = () => {
      boost = Math.min(5, boost + 0.6);
    };
    const tick = () => {
      boost *= 0.92;
      tweens.forEach((tw) => tw.timeScale(1 + boost));
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener("scroll", onScroll);
      gsap.ticker.remove(tick);
      tweens.forEach((tw) => tw.kill());
    };
  }, []);

  return (
    <div ref={root} className="overflow-hidden py-4" aria-hidden>
      {rows.map((row, i) => (
        <div key={i} className="flex">
          <div data-track className="flex flex-none will-change-transform">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex flex-none items-center">
                {row.map((name) => (
                  <span
                    key={`${copy}-${name}`}
                    className={clsx(
                      "flex items-center px-[2.2vw] font-display text-[clamp(3rem,2rem+5vw,7.5rem)] leading-[1.05] font-bold tracking-[-0.045em] whitespace-nowrap uppercase wd-125",
                      i % 2
                        ? tone === "night"
                          ? "text-transparent [-webkit-text-stroke:1px_rgb(239_237_232/0.35)]"
                          : "text-transparent [-webkit-text-stroke:1px_rgb(13_15_18/0.3)]"
                        : tone === "night"
                          ? "text-chalk/90"
                          : "text-carbon",
                    )}
                  >
                    {name}
                    <span className={clsx("ml-[4.4vw] inline-block size-[0.18em] rounded-full", tone === "night" ? "bg-ion" : "bg-ion-deep")} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
