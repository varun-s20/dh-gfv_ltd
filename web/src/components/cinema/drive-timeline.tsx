"use client";

import { clsx } from "clsx";
import { useEffect, useRef, useState } from "react";
import { SideCar, wheelSpinner } from "@/components/cars/side-car";
import { Em, Plate } from "@/components/ui/primitives";
import { heroCar, type SideProfile } from "@/content/cars";
import { processSteps } from "@/content/shared";
import { ScrollTrigger, gsap, prefersReducedMotion } from "@/lib/motion";
import { site } from "@/lib/site";

const p = site.promises;

const details = [
  ["Registration, mileage and the exact version", "Condition and any warning lights, honestly", "Battery health if you have it", "Four photos: front, back, seats, dashboard"],
  ["Read by a person, not a pricing robot", `One firm figure ${p.quoteTurnaround}`, "By WhatsApp or email, as you choose", `Held for ${p.offerValidDays} days while you decide`],
  [
    "Accept online in one tap",
    "A time and place that suit you",
    p.paidBeforeCollection ? "Bank transfer before we take the keys" : "Bank transfer on collection",
    p.financeSettled ? "Any finance settled with your lender" : "V5C, keys and cables ready",
  ],
];

/**
 * How it works, as a drive: the page pins and the three steps pass sideways
 * like roadside boards while a car rolls along the road beneath them. Each
 * board stops in the middle of the screen, whole, before the next comes in.
 */
export function DriveTimeline({
  heading = "Three steps. *One firm offer.*",
  tone = "night",
  className,
  car: vehicle = heroCar,
}: {
  heading?: string;
  tone?: "night" | "pearl";
  className?: string;
  /** The vehicle on the road; each landing page drives its own. */
  car?: SideProfile;
}) {
  const root = useRef<HTMLElement>(null);
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
    const track = q('[data-s="track"]')[0] as HTMLElement;
    const car = q('[data-s="car"]')[0] as HTMLElement;
    const road = q('[data-s="road"]')[0] as HTMLElement;
    const panels = q('[data-s="panel"]');
    const ctx = gsap.context(() => {
      // The car is centred with a -50% translate; hand it to GSAP so the x tween below keeps it.
      gsap.set(car, { xPercent: -50, x: 0 });
      // Where the track must sit for board i to be centred on screen.
      const centred = (i: number) => -(panels[i]!.offsetLeft + panels[i]!.offsetWidth / 2 - window.innerWidth / 2);
      let travelled = 0;
      // The car faces the way we travel (mirrored), so its wheels turn the other way in its own frame.
      const spin = wheelSpinner(car, vehicle, () => -travelled * 0.55);
      const setRoad = gsap.quickSetter(road, "backgroundPositionX", "px");
      let active = 0;
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: el,
          start: "top top",
          end: () => `+=${window.innerHeight * (0.8 * panels.length + 0.2)}`,
          pin: q('[data-s="pin"]')[0],
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: () => {
            const x = Number(gsap.getProperty(track, "x"));
            travelled = -x;
            spin();
            setRoad(x * 1.4);
            // The board nearest the middle of the screen is the active one.
            let best = 0;
            panels.forEach((_, n) => {
              if (Math.abs(centred(n) - x) < Math.abs(centred(best) - x)) best = n;
            });
            if (best !== active) {
              active = best;
              panels.forEach((pnl, n) => pnl.toggleAttribute("data-active", n === best));
            }
          },
        },
      });
      tl.set(track, { x: () => centred(0) }, 0);
      panels.forEach((_, i) => {
        if (i > 0) tl.to(track, { x: () => centred(i), duration: 1, ease: "power2.inOut" }, ">0.7");
      });
      tl.to({}, { duration: 0.7 });
      tl.fromTo(car, { x: () => -window.innerWidth * 0.06 }, { x: () => window.innerWidth * 0.06, duration: tl.duration() }, 0);
      ScrollTrigger.refresh();
    }, el);
    return () => ctx.revert();
  }, [vehicle]);

  const night = tone === "night";

  return (
    <section ref={root} className={clsx("relative isolate", night ? "bg-night-950" : "on-pearl", className)} data-nav-theme={night ? "night" : "pearl"}>
      <div data-s="pin" className={clsx("relative overflow-hidden", reduced ? "py-24" : "h-svh")}>
        <div className={clsx("container-page", reduced ? "" : "absolute inset-x-0 top-[13svh] z-10 short:top-[5.25rem]")}>
          <h2 className="display max-w-[16ch] text-d2">
            <Em text={heading} />
          </h2>
        </div>

        <div
          data-s="track"
          className={clsx(
            "flex gap-[4vw] will-change-transform",
            reduced ? "mt-12 flex-col px-[5vw]" : "absolute top-[27svh] left-0 items-stretch px-[7vw] sm:top-[calc(13svh_+_2_*_clamp(2.1rem,1.45rem_+_2.7vw,4.25rem)_+_2.25rem)] sm:px-[15vw] lg:px-[21vw] short:top-[9.75rem]",
          )}
        >
          {processSteps.map((s, i) => (
            <article
              key={s.title}
              data-s="panel"
              data-active={i === 0 ? true : undefined}
              className={clsx(
                "group relative grid flex-none rounded-[1.75rem] transition-[background-color,box-shadow] duration-700",
                reduced
                  ? "w-full gap-6 p-7"
                  : "w-[86vw] gap-5 p-5 sm:w-[70vw] sm:p-8 lg:w-[58vw] lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:p-9",
                night
                  ? "bg-night-850 ring-1 ring-chalk/[0.07] data-[active]:bg-night-800 data-[active]:shadow-[0_2rem_5rem_-2rem_rgb(0_0_0/0.9)]"
                  : "bg-pearl-50 ring-1 ring-carbon/[0.06] data-[active]:shadow-[0_2rem_4rem_-2rem_rgb(13_15_18/0.35)]",
              )}
            >
              <div className="flex flex-col">
                <p className="flex items-center gap-3">
                  <span
                    aria-hidden
                    data-n={`0${i + 1}`}
                    className={clsx(
                      "font-display text-[clamp(2.6rem,1.8rem+2.6vw,4.5rem)] leading-[0.8] font-bold tracking-[-0.06em] transition-colors duration-700 wd-125 before:content-[attr(data-n)] short:hidden",
                      night ? "text-chalk/[0.1] group-data-[active]:text-ion/80" : "text-carbon/10 group-data-[active]:text-ion-deep",
                    )}
                  />
                  <span className="sr-only">Step {i + 1}</span>
                </p>
                <h3 className="mt-4 font-display text-[clamp(1.5rem,1.2rem+1.1vw,2.3rem)] leading-[1.05] font-medium tracking-[-0.03em] short:mt-0 sm:mt-5">{s.title}</h3>
                <p className={clsx("mt-3 max-w-md text-[0.95rem] leading-relaxed short:text-[0.875rem] sm:text-base", night ? "text-chalk-2" : "text-carbon-2")}>{s.body}</p>
                <ul className="mt-auto hidden space-y-2 pt-6 sm:block [@media(max-height:860px)]:hidden">
                  {details[i]!.map((d) => (
                    <li key={d} className={clsx("flex items-center gap-3 text-[0.9rem]", night ? "text-chalk-2" : "text-carbon-2")}>
                      <span className={clsx("size-1.5 flex-none rounded-full", night ? "bg-ion" : "bg-ion-deep")} />
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="hidden items-center justify-center lg:flex">
                <StepVisual i={i} />
              </div>
            </article>
          ))}
        </div>

        {!reduced ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-[4.5rem] h-[20svh] lg:bottom-0 lg:h-[19svh]" aria-hidden>
            <div
              data-s="road"
              className="absolute inset-x-0 bottom-[22%] h-[3px] opacity-60"
              style={{ backgroundImage: `repeating-linear-gradient(90deg, ${night ? "rgb(239 237 232 / 0.55)" : "rgb(13 15 18 / 0.4)"} 0 46px, transparent 46px 96px)` }}
            />
            <div className={clsx("absolute inset-x-0 bottom-0 h-[22%]", night ? "bg-night-900" : "bg-pearl-200")} />
            <div data-s="car" className="absolute bottom-[19%] left-[50%] w-[min(54vw,22rem)] -translate-x-1/2 short:w-[42vw] sm:w-[min(40vw,26rem)] lg:w-[min(30vw,23rem,40svh)]">
              <div data-car-body className="-scale-x-100">
                <SideCar car={vehicle} sizes="28rem" />
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function StepVisual({ i }: { i: number }) {
  if (i === 0) {
    return (
      <div className="w-full max-w-[19rem] rounded-[1.6rem] bg-pearl-50 p-4 text-carbon shadow-[0_1.5rem_3rem_-1.5rem_rgb(0_0_0/0.6)]">
        <p className="label text-carbon-3">Your vehicle</p>
        <Plate reg="AB12 CDE" size="md" tone="front" className="mt-3" />
        <dl className="mt-4 space-y-2 text-[0.85rem]">
          {[
            ["Model", "Model S Long Range"],
            ["Mileage", "38,600 mi"],
            ["Battery health", "91%"],
            ["Photos", "4 added"],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between border-b border-carbon/10 pb-2 last:border-0">
              <dt className="text-carbon-3">{k}</dt>
              <dd className="font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    );
  }
  if (i === 1) {
    return (
      <div className="w-full max-w-[19rem] rounded-[1.4rem] bg-[#0f1a15] p-3 shadow-[0_2rem_4rem_-1rem_rgb(0_0_0/0.7)] ring-1 ring-ion/15">
        <div className="flex items-center gap-2 px-1 pb-2 text-[0.72rem] text-chalk-3">
          <span className="ion-dot" /> WhatsApp · {site.brand.name}
        </div>
        <div className="rounded-2xl rounded-tl-md bg-[#1c2b25] p-4 text-[0.9rem] leading-snug text-chalk">
          Thanks for the photos. Our firm offer for your 2020 Model S Long Range is
          <span className="mt-2 block font-display text-[1.9rem] font-semibold tracking-[-0.03em] text-ion tabular-nums">£28,950</span>
          <span className="mt-1 block text-[0.75rem] text-chalk-3">Valid for {p.offerValidDays} days · Example offer</span>
        </div>
      </div>
    );
  }
  return (
    <div className="w-full max-w-[19rem] space-y-2">
      <div className="flex items-center gap-4 rounded-[1.4rem] bg-chalk p-4 text-carbon shadow-[0_2rem_4rem_-1rem_rgb(0_0_0/0.6)]">
        <span className="flex size-11 flex-none items-center justify-center rounded-full bg-ion-deep text-pearl-50">
          <svg viewBox="0 0 16 16" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m3.5 8.5 3 3 6-7" />
          </svg>
        </span>
        <span>
          <span className="block font-display font-semibold">Payment received</span>
          <span className="block text-[0.85rem] text-carbon-2">£28,950 · bank transfer</span>
        </span>
      </div>
      <div className="rounded-[1.4rem] bg-night-700 p-4 text-[0.85rem] text-chalk-2 ring-1 ring-chalk/10">
        <span className="label text-chalk-3">Collection</span>
        <span className="mt-1 block font-display text-[1.1rem] text-chalk">Thursday, 10:00</span>
        {p.freeCollection ? <span className="block">Free, from your door</span> : null}
      </div>
    </div>
  );
}
