"use client";

import { clsx } from "clsx";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Em } from "@/components/ui/primitives";
import type { SideCar } from "@/content/cars";
import { gsap, prefersReducedMotion } from "@/lib/motion";

export type SpecPoint = { title: string; body: string; x: number; y: number };

/**
 * A spec sheet in the manner of a manufacturer's configurator: the car scans
 * into its X-ray, then each point we price lights up in turn with its note.
 */
export function SpecSheet({ car, heading, points }: { car: SideCar; heading: string; points: SpecPoint[] }) {
  const root = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off read of a browser preference
      setReduced(true);
      return;
    }
    const q = gsap.utils.selector(el);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: "bottom bottom",
          scrub: 0.7,
          onUpdate: (self) => {
            const t = (self.progress - 0.18) / 0.82;
            const i = Math.max(0, Math.min(points.length - 1, Math.floor(t * points.length)));
            setActive((prev) => (prev === i ? prev : i));
          },
        },
      });
      tl.fromTo(q('[data-s="photo"]'), { clipPath: "inset(0% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 100%)", duration: 0.16 }, 0.02)
        .fromTo(q('[data-s="xray"]'), { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.16 }, 0.02)
        .fromTo(q('[data-s="scan"]'), { left: "0%", opacity: 1 }, { left: "100%", opacity: 1, duration: 0.16 }, 0.02)
        .to(q('[data-s="scan"]'), { opacity: 0, duration: 0.02 }, 0.18)
        .fromTo(q('[data-s="dot"]'), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.06, stagger: 0.02, ease: "back.out(2)" }, 0.17)
        .set({}, {}, 1);
    }, el);
    return () => ctx.revert();
  }, [points.length]);

  return (
    <section ref={root} className={clsx("relative isolate bg-night-950", reduced ? "py-24" : "h-[420svh]")} data-nav-theme="night">
      <div className={clsx("overflow-hidden", reduced ? "" : "sticky top-0 flex h-svh items-center pt-16 short:pb-16 lg:pt-0")}>
        <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_62%_55%,rgb(157_240_196/0.06),transparent_70%)]" />
        <div className="container-page relative grid w-full items-center gap-6 lg:grid-cols-[0.7fr_1.3fr]">
          <div className="order-2 lg:order-1">
            <h2 className="display max-w-[14ch] text-d2 short:sr-only">
              <Em text={heading} />
            </h2>
            <div className={clsx("relative mt-6 short:mt-0 lg:mt-8", reduced ? "space-y-8" : "h-[13.5rem] sm:h-[13rem]")}>
              {points.map((pt, i) => (
                <div
                  key={pt.title}
                  className={clsx(
                    reduced ? "" : "absolute inset-0 transition-[opacity,translate] duration-500 ease-glide",
                    !reduced && (i === active ? "translate-y-0 opacity-100" : i < active ? "-translate-y-4 opacity-0" : "translate-y-4 opacity-0"),
                  )}
                  aria-hidden={!reduced && i !== active}
                >
                  <p className="flex items-center gap-3">
                    <span className="font-mono text-[0.78rem] text-ion">0{i + 1}</span>
                    <span className="h-px w-10 bg-ion/50" />
                    <span className="font-mono text-[0.72rem] text-chalk-3">
                      of 0{points.length}
                    </span>
                  </p>
                  <h3 className="mt-4 font-display text-[clamp(1.5rem,1.2rem+1vw,2.1rem)] font-medium tracking-[-0.03em]">{pt.title}</h3>
                  <p className="mt-3 max-w-md leading-relaxed text-chalk-2">{pt.body}</p>
                </div>
              ))}
            </div>
            {!reduced ? (
              <div className="mt-6 flex gap-1.5 short:hidden" aria-hidden>
                {points.map((pt, i) => (
                  <span key={pt.title} className={clsx("h-1 rounded-full transition-[width,background-color] duration-500", i === active ? "w-10 bg-ion" : "w-4 bg-chalk/15")} />
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative order-1 -mx-2 sm:mx-0 lg:order-2">
            <div className="relative" style={{ aspectRatio: `${car.side.width} / ${car.side.height}` }}>
              <div data-s="photo" className="absolute inset-0">
                <Image src={car.side} alt={car.alt} sizes="(min-width: 1024px) 64vw, 110vw" quality={85} className="h-auto w-full" />
              </div>
              <div data-s="xray" className="absolute inset-0" style={reduced ? undefined : { clipPath: "inset(0% 100% 0% 0%)" }}>
                <Image src={car.xray} alt="" sizes="(min-width: 1024px) 64vw, 110vw" className="h-auto w-full" />
              </div>
              <div data-s="scan" className="pointer-events-none absolute top-[-6%] bottom-[-6%] w-[2px] -translate-x-1/2 bg-ion opacity-0 shadow-[0_0_24px_6px_rgb(157_240_196/0.55)]" aria-hidden />
              {points.map((pt, i) => (
                <span
                  key={pt.title}
                  data-s="dot"
                  className="absolute size-0"
                  style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                  aria-hidden
                >
                  <span
                    className={clsx(
                      "absolute -top-2 -left-2 size-4 rounded-full border-2 transition-[background-color,border-color,box-shadow] duration-500",
                      i === active ? "border-ion bg-ion shadow-[0_0_0_6px_rgb(157_240_196/0.18),0_0_24px_rgb(157_240_196/0.8)]" : "border-ion/70 bg-night-950",
                    )}
                  />
                  {i === active ? <span className="absolute -top-6 -left-6 size-12 animate-ping rounded-full border border-ion/40" /> : null}
                  <span className={clsx("label absolute top-3 left-3 whitespace-nowrap transition-opacity duration-500", i === active ? "text-ion opacity-100" : "text-chalk-3 opacity-60")}>
                    0{i + 1}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
