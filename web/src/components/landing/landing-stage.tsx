"use client";

import { clsx } from "clsx";
import Image from "next/image";
import { useEffect, useLayoutEffect, useRef } from "react";
import { SideCar, wheelSpinner } from "@/components/cars/side-car";
import { RegEntry } from "@/components/marketing/reg-entry";
import { Em } from "@/components/ui/primitives";
import { shots, type ShotKey } from "@/content/cars";
import type { LandingContent } from "@/content/landing";
import { fitAbove, trackHeroBand } from "@/lib/hero-band";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { site } from "@/lib/site";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

/** How large each three-quarter shot stands on the stage: the width on phones and on desktop, capped by height. */
const STAGE: Partial<Record<ShotKey, string>> = {
  model3p: "w-[94vw] sm:w-[84vw] md:w-[78vw] lg:w-[min(58vw,94svh)]",
  model3: "w-[94vw] sm:w-[84vw] md:w-[78vw] lg:w-[min(60vw,98svh)]",
  taycan: "w-[98vw] sm:w-[90vw] md:w-[84vw] lg:w-[min(64vw,104svh)]",
  ioniq5: "w-[98vw] sm:w-[88vw] md:w-[82vw] lg:w-[min(62vw,100svh)]",
  idbuzz: "w-[86vw] sm:w-[70vw] md:w-[62vw] lg:w-[min(46vw,74svh)]",
  edeliver3: "w-[88vw] sm:w-[72vw] md:w-[62vw] lg:w-[min(42vw,68svh)]",
};
/** Side-on vehicles run wide (and sit a little higher on desktop); a taller one, like a van, is held to the same height. */
const SIDE_STAGE = "w-[96vw] sm:w-[90vw] md:w-[86vw] lg:w-[min(74vw,122svh,calc(42svh*var(--ar)))]";

/**
 * Landing-page opening: the page's word stands behind its vehicle, the vehicle
 * drives in under a showroom light, and on scroll it moves aside for "what we
 * price" without the page ever cutting to a new section. A side-on vehicle's
 * wheels roll with every move.
 */
export function LandingStage({
  hero,
  backdrop,
  vehicle,
  category,
  priced,
}: {
  hero: LandingContent["hero"];
  backdrop: string;
  vehicle: LandingContent["vehicle"];
  category: LandingContent["category"];
  priced: LandingContent["priced"];
}) {
  const root = useRef<HTMLElement>(null);
  const word = backdrop.toUpperCase();
  const pic = vehicle.kind === "side" ? vehicle.car.side : shots[vehicle.shot].src;
  // A stable key for the effects (the vehicle object itself is re-created per render).
  const car = vehicle.kind === "side" ? vehicle.car.name : vehicle.shot;

  // Phones and tablets: word and vehicle fit the room between headline and form.
  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    return trackHeroBand(el);
  }, [car]);

  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    document.documentElement.classList.remove("story-intro");
    if (prefersReducedMotion()) return;
    const q = gsap.utils.selector(el);
    const carEl = q('[data-s="car"]')[0] as HTMLElement;
    const carIntro = q('[data-s="car-intro"]')[0] as HTMLElement;
    const letters = q('[data-s="letter"]');
    const light = q('[data-s="light"]');
    const slot = q('[data-s="slot"]')[0] as HTMLElement;
    const priced = q('[data-s="priced"]')[0] as HTMLElement;
    // Rims roll by the distance the car has actually travelled on screen.
    const spin =
      vehicle.kind === "side"
        ? wheelSpinner(
            carIntro,
            vehicle.car,
            () => Number(gsap.getProperty(carEl, "x")) + Number(gsap.getProperty(carIntro, "x")) * (Number(gsap.getProperty(carEl, "scale")) || 1),
            () => Number(gsap.getProperty(carEl, "scale")) || 1,
          )
        : () => {};
    // Fit the car inside the empty column beside "what we price", measured live.
    const fit = () => {
      const r = slot.getBoundingClientRect();
      return { x: r.left + r.width / 2 - window.innerWidth / 2, scale: Math.min(0.9, (r.width * 0.92) / carEl.offsetWidth) };
    };
    // Phones and tablets: the car rises into the room above "what we price". It's translated -50%,
    // so its resting centre is its offsetTop.
    const above = () => fitAbove(priced, carEl, carEl.offsetTop, 0.8);

    const ctx = gsap.context(() => {
      // Hand the -50% centring to GSAP explicitly, and zero the pixel offsets. Left to infer it from
      // the CSS translate, GSAP compares against rounded sizes and, for an odd-sized car, reads it
      // as fixed pixels, which a later tween would overwrite (or this would double).
      gsap.set(carEl, { xPercent: -50, yPercent: -50, x: 0, y: 0 });
      const mm = gsap.matchMedia();
      mm.add({ desktop: "(min-width: 1024px)", mobile: "(max-width: 1023px)" }, (c) => {
        const desktop = Boolean(c.conditions?.desktop);
        const W = () => window.innerWidth;
        const H = () => window.innerHeight;
        const intro = gsap.timeline({ delay: 0.1 });
        intro
          .fromTo(letters, { yPercent: 108 }, { yPercent: 0, duration: 1.2, ease: "expo.out", stagger: 0.06 }, 0)
          .fromTo(light, { opacity: 0 }, { opacity: 1, duration: 1.4, ease: "power2.out" }, 0.1)
          .fromTo(carIntro, { x: () => W() * 0.42 }, { x: 0, duration: 1.9, ease: "power3.out", onUpdate: spin }, 0.15);

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.9, invalidateOnRefresh: true },
          onUpdate: () => {
            // Scrolling before the car has arrived: let it arrive now, so the two moves never stack.
            if (window.scrollY > 8 && intro.progress() < 1) intro.timeScale(5);
            spin();
          },
        });
        tl.to(q('[data-s="hero-copy"]'), { autoAlpha: 0, y: () => -H() * 0.06, duration: 0.4, ease: "power1.in" }, 0.05)
          .to(q('[data-s="word"]'), { y: () => -H() * 0.12, opacity: 0, duration: 0.6, ease: "power1.in" }, 0.05)
          .to(light, { opacity: 0.35, duration: 0.6 }, 0.1)
          .to(
            carEl,
            desktop
              ? // Centred on the copy beside it (which sits mid-screen); the car is translated -50%, so offsetTop is its centre.
                { x: () => fit().x, y: () => H() / 2 - carEl.offsetTop, scale: () => fit().scale, duration: 0.55, ease: "power2.inOut" }
              : { y: () => above().y, scale: () => above().scale, opacity: () => above().opacity, duration: 0.55, ease: "power2.inOut" },
            0.05,
          )
          .fromTo(q('[data-s="point"]'), { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.08, ease: "power2.out" }, 0.7)
          .set({}, {}, 1.6);
        return () => intro.kill();
      });
    }, el);
    return () => ctx.revert();
  }, [car]);

  return (
    <section ref={root} className="relative isolate h-[260svh] bg-night-950 motion-reduce:h-auto" data-nav-theme="night">
      <div className="sticky top-0 h-svh overflow-hidden motion-reduce:relative">
        <div className="spotlight absolute inset-0" />
        <div data-s="word" className="pointer-events-none absolute inset-x-0 top-[var(--word-top,30%)] flex justify-start overflow-hidden sm:top-[var(--word-top,25%)] sm:justify-center lg:top-[13%]">
          <p
            className={clsx("backdrop-word flex overflow-hidden pb-[0.06em] text-[length:var(--wm)] lg:text-[length:var(--wd)]", word.length > 6 && "word-drift")}
            style={{ "--wm": `${word.length > 6 ? 30 : Math.min(44, 86 / (word.length * 0.84))}vw`, "--wd": `${Math.min(27, 88 / (word.length * 0.84))}vw` } as React.CSSProperties}
            aria-hidden
          >
            {word.split("").map((ch, i) => (
              <span key={i} data-s="letter" className="story-letter backdrop-word-fill inline-block">
                {ch}
              </span>
            ))}
          </p>
        </div>

        {/* Showroom light */}
        <div aria-hidden data-s="light" className="pointer-events-none absolute inset-0">
          <div className="absolute top-[34%] left-1/2 h-[60%] w-[100vw] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(239_237_232/0.13),rgb(239_237_232/0.04)_55%,transparent)] lg:w-[74vw]" />
          <div className="absolute top-[66%] left-1/2 h-[24%] w-[112vw] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(239_237_232/0.12),transparent)] lg:w-[80vw]" />
        </div>

        <div
          data-s="car"
          className={clsx(
            "absolute top-[var(--car-c,57%)] left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 will-change-transform sm:top-[var(--car-c,55%)]",
            "max-lg:max-w-[calc(var(--car-max-h,200svh)*var(--ar))]",
            vehicle.kind === "side" ? `${SIDE_STAGE} lg:top-[50%]` : `${STAGE[vehicle.shot] ?? STAGE.model3} lg:top-[53%]`,
          )}
          style={{ "--ar": pic.width / pic.height } as React.CSSProperties}
        >
          <div data-s="car-intro" className="story-car relative">
            {vehicle.kind === "side" ? (
              <SideCar car={vehicle.car} priority sizes="(min-width: 1024px) 74vw, 96vw" />
            ) : (
              <>
                <div className="absolute inset-x-[10%] bottom-[0%] h-[9%] rounded-[50%] bg-black/80 blur-[18px]" />
                <Image
                  src={pic}
                  alt={shots[vehicle.shot].alt}
                  loading="eager"
                  fetchPriority="high"
                  quality={75}
                  sizes="(min-width: 1024px) 64vw, (min-width: 640px) 90vw, 98vw"
                  className="relative h-auto w-full select-none"
                  draggable={false}
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="relative z-30 -mt-[100svh]">
        <div
          data-s="hero-copy"
          className="container-page relative flex h-svh flex-col justify-between gap-6 pt-[6.5rem] pb-[max(1.25rem,3svh)] short:gap-4 short:pt-[5.25rem] lg:flex-row lg:items-end lg:pt-0 lg:pb-[5svh]"
        >
          <div className="max-w-[40rem]">
            <p className="eyebrow flex items-center gap-2.5 text-chalk-2 short:hidden">
              <span className="ion-dot" />
              {hero.eyebrow}
            </p>
            <h1 className="display mt-4 text-[clamp(2rem,1.4rem+2.2vw,3.15rem)] leading-[1.02] short:mt-0 short:text-[1.75rem]">
              <Em text={hero.headline} />
            </h1>
            <p className="mt-4 hidden max-w-[31rem] text-[1rem] leading-relaxed text-chalk-2 lg:block">{hero.sub}</p>
          </div>
          {/* The room the word and the vehicle are fitted into on phones and tablets */}
          <div data-s="band" className="min-h-0 flex-1 lg:hidden" aria-hidden />
          <div className="w-full lg:w-[29rem] lg:flex-none">
            <RegEntry location={`landing-${category}-hero`} category={category} label={hero.ctaLabel} className="short:[&_label]:sr-only" />
            <p className="mt-3 text-[0.8rem] text-chalk-3 short:hidden">
              One firm offer {site.promises.quoteTurnaround}
              {site.promises.noFees ? " · No fees" : ""}
              {site.promises.freeCollection ? " · Free collection" : ""}
            </p>
          </div>
        </div>

        <div className="relative h-[160svh] motion-reduce:h-auto motion-reduce:py-24">
          <div className="sticky top-0 flex h-svh items-end pb-24 lg:items-center lg:pb-0 motion-reduce:relative motion-reduce:h-auto">
            <div className="container-page grid lg:grid-cols-2">
              {/* Desktop: the car drives forward into this column, on the left, with the copy beside it. */}
              <div data-s="slot" className="hidden lg:block" aria-hidden />
              <div data-s="priced" className="rounded-3xl bg-night-950/75 p-1 backdrop-blur-sm sm:max-w-xl lg:max-w-none lg:bg-transparent lg:p-0 lg:pl-10 lg:backdrop-blur-none xl:pl-14">
                <h2 className="display max-w-[15ch] text-d2">
                  <Em text={priced.heading} />
                </h2>
                <p className="mt-4 max-w-md text-chalk-2 max-lg:[@media(max-height:760px)]:hidden lg:[@media(max-height:860px)]:hidden">{priced.sub}</p>
                <ul className="mt-8 grid gap-x-8 sm:grid-cols-2 lg:[@media(max-height:860px)]:mt-5">
                  {priced.points.map((pt, i) => (
                    <li key={pt.title} data-s="point" className="border-t hairline py-4 lg:py-5">
                      <p className="flex items-baseline gap-3">
                        <span className="font-mono text-[0.72rem] text-ion">0{i + 1}</span>
                        <span className="font-display text-[1.08rem] font-medium tracking-[-0.015em]">{pt.title}</span>
                      </p>
                      <p className="mt-1.5 hidden pl-8 text-[0.9rem] leading-relaxed text-chalk-2 sm:block lg:[@media(max-height:800px)]:hidden">{pt.body}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
