"use client";

import { clsx } from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { RegEntry } from "@/components/marketing/reg-entry";
import { Chevron, Cta, Plate } from "@/components/ui/primitives";
import { heroCar } from "@/content/cars";
import { fleet } from "@/content/fleet";
import { processSteps } from "@/content/shared";
import { fitAbove, trackHeroBand } from "@/lib/hero-band";
import { ScrollTrigger, gsap, prefersReducedMotion } from "@/lib/motion";
import { site } from "@/lib/site";
import { BatteryPack } from "./battery-pack";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

const WORD = "Electric";
const SOH = 94;

/** Timeline positions are in viewport heights; they match the chapter heights below. */
const CH = { hero: 100, categories: 150, battery: 380, process: 300 };
const TOTAL = (CH.hero + CH.categories + CH.battery + CH.process - 100) / 100; // 8.3

const car = heroCar;
const pack = heroCar.pack;
const lampAt = heroCar.lamp;
/** Where the tyres touch the ground, as a fraction of the image height. */
const GROUND = heroCar.ground / 100;
/** Timeline times at which the car pulls up at each of the three steps. */
const ARRIVE = [6.5, 7.3, 7.95];

type CategoryKey = "tesla" | "ev" | "van";

/** Side-on, facing the same way as the site's car: the vehicle shown while a category is hovered. */
const sideOf = (slug: string) => fleet.find((v) => v.slug === slug)?.views[0]?.src ?? null;

const categories: Array<{ key: CategoryKey; side: ReturnType<typeof sideOf>; title: string; detail: string; href: "/sell-my-tesla" | "/sell-my-electric-car" | "/sell-my-electric-van" }> = [
  { key: "tesla", side: null, title: "Tesla", detail: "Model 3, Y, S and X. Software and battery health priced in.", href: "/sell-my-tesla" },
  { key: "ev", side: sideOf("byd-atto-3"), title: "Electric cars", detail: "BYD, MG, Kia, Hyundai, Nissan and every other make.", href: "/sell-my-electric-car" },
  { key: "van", side: sideOf("vauxhall-vivaro-electric"), title: "Electric vans", detail: "One van or a whole fleet, private or business.", href: "/sell-my-electric-van" },
];

const callouts = [
  { k: "State of health", v: "How much of its original capacity the battery still holds.", side: "left", top: "top-[30%]" },
  { k: "Warranty left", v: "Most EV batteries carry eight years of cover. What's left is worth money.", side: "left", top: "top-[47%]" },
  { k: "Charging history", v: "Rapid charging, range at 100% and how it's been looked after.", side: "right", top: "top-[30%]" },
  { k: "Faults and warnings", v: "Any battery or drive-unit warnings, so nothing changes at your door.", side: "right", top: "top-[47%]" },
] as const;

/**
 * The home page story. One car stays on a pinned stage while the page scrolls
 * past it: it drives in under a giant word, steps aside for the three things we
 * buy, expands and turns to X-ray so its battery can lift out, then waits beside
 * the three steps before driving away.
 */
export function HomeStory() {
  const root = useRef<HTMLElement>(null);
  const [hover, setHover] = useState<CategoryKey | null>(null);
  const [reduced, setReduced] = useState(false);
  const hoverShot = categories.find((c) => c.key === hover)?.side ?? null;

  // Phones and tablets: word and car fit the room between headline and form.
  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    return trackHeroBand(el);
  }, []);

  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      setReduced(true);
      document.documentElement.classList.remove("story-intro");
      return;
    }
    const q = gsap.utils.selector(el);
    const one = (s: string) => q(`[data-s="${s}"]`)[0] as HTMLElement;
    const carEl = one("car");
    const carIntro = one("car-intro");
    const carBox = one("car-box");
    const photo = one("photo");
    const xray = one("xray");
    const scan = one("scan");
    const packEl = one("pack");
    const plate = one("plate");
    const faces = q('[data-s="face"], [data-s="plate"]');
    const lit = one("lit");
    const lamp = one("lamp");
    const soh = one("soh");
    const sohValue = one("soh-value");
    const word = one("word");
    const light = q('[data-s="halo"], [data-s="floor"]');
    const letters = q('[data-s="letter"]');
    const rims = q('[data-s="rim"]');
    const steps = q('[data-s="step"]');
    const stepCards = q('[data-s="step-card"]');
    const nodes = q('[data-s="node"]');
    const slotCategories = one("slot-categories");
    const catCopy = one("cat-copy");
    const road = one("road");
    const track = one("track");
    const trail = one("trail");

    // Pack geometry tracks the car's rendered size (CSS 3D needs lengths, not percentages).
    const sizePack = () => {
      const w = carBox.offsetWidth;
      packEl.style.setProperty("--pack-depth", `${w * (pack.width / 100) * 0.46}px`);
    };
    sizePack();
    const ro = new ResizeObserver(sizePack);
    ro.observe(carBox);

    // Rims roll with the car: angle = distance / radius. Distance is measured against the road,
    // which moves instead of the car on phones; a mirrored car turns its wheels the other way.
    let lastX: number | null = null;
    let angle = 0;
    const setRims = rims.map((r) => gsap.quickSetter(r, "rotation", "deg"));
    const spin = () => {
      const scale = Number(gsap.getProperty(carEl, "scale")) || 1;
      const x = Number(gsap.getProperty(carEl, "x")) + Number(gsap.getProperty(carIntro, "x")) * scale - Number(gsap.getProperty(track, "x"));
      if (lastX === null) lastX = x;
      const radius = (carBox.offsetWidth * (car.rims.front.d / 100) * scale) / 2;
      const dir = Number(gsap.getProperty(carBox, "scaleX")) < 0 ? -1 : 1;
      angle += dir * ((x - lastX) / radius) * (180 / Math.PI);
      lastX = x;
      setRims.forEach((set) => set(angle));
    };

    // The ion trail runs along the road from its start to under the car.
    const setTrail = gsap.quickSetter(trail, "width", "px");
    const drawTrail = () => {
      const c = carEl.getBoundingClientRect();
      setTrail(Math.max(0, c.left + c.width / 2 - track.getBoundingClientRect().left));
    };

    let activeStep = -1;
    let litCount = -1;
    const setStep = (t: number) => {
      const s = t < ARRIVE[1]! - 0.2 ? 0 : t < ARRIVE[2]! - 0.2 ? 1 : 2;
      if (s !== activeStep) {
        activeStep = s;
        steps.forEach((node, i) => node.toggleAttribute("data-active", i === s));
      }
      const lit = ARRIVE.filter((a) => t >= a - 0.02).length;
      if (lit !== litCount) {
        litCount = lit;
        nodes.forEach((node, i) => node.toggleAttribute("data-lit", i < lit));
      }
    };

    /** Where the car must go (offset and scale) to sit inside a page column, measured live. */
    const fitTo = (slot: HTMLElement, fill: number) => {
      const r = slot.getBoundingClientRect();
      const scale = Math.min(0.92, (r.width * fill) / carEl.offsetWidth);
      return { x: r.left + r.width / 2 - window.innerWidth / 2, scale };
    };

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();
      mm.add({ desktop: "(min-width: 1024px)", mobile: "(max-width: 1023px)" }, (c) => {
        const desktop = Boolean(c.conditions?.desktop);
        const W = () => window.innerWidth;
        const H = () => window.innerHeight;

        /* ------------------------------------------------ arrival */
        document.documentElement.classList.remove("story-intro");
        const intro = gsap.timeline({ delay: 0.1 });
        intro
          .fromTo(letters, { yPercent: 108 }, { yPercent: 0, duration: 1.25, ease: "expo.out", stagger: 0.055 }, 0)
          .fromTo(carIntro, { x: () => W() * 0.42 }, { x: 0, duration: 1.9, ease: "power3.out", onUpdate: spin }, 0.15)
          .fromTo(lamp, { opacity: 0 }, { opacity: 1, duration: 0.18, yoyo: true, repeat: 1, ease: "power1.inOut" }, 1.85)
          .to(lamp, { opacity: 0.55, duration: 0.6 }, 2.25);

        /* ------------------------------------------------ scroll story */
        // Desktop side positions are measured from the real columns, so the car can't spill out of frame.
        const side = (slot: HTMLElement) => ({
          x: () => fitTo(slot, 0.96).x,
          y: () => -H() * 0.03,
          scale: () => fitTo(slot, 0.96).scale,
        });
        // Phones: chapter positions are heights on screen, wherever the hero placed the car at rest;
        // beside the categories and the steps it rises into whatever room their copy leaves.
        const rest = () => carEl.offsetTop + carEl.offsetHeight / 2;
        const above = (block: HTMLElement, maxScale: number) => ({
          x: 0,
          y: () => fitAbove(block, carEl, rest(), maxScale).y,
          scale: () => fitAbove(block, carEl, rest(), maxScale).scale,
          opacity: () => fitAbove(block, carEl, rest(), maxScale).opacity,
        });
        const S = desktop
          ? {
              s1: side(slotCategories),
              s2: { x: 0, y: () => H() * 0.04, scale: 1.04 },
              s2low: { y: () => H() * 0.42, scale: 0.9 },
            }
          : {
              s1: above(catCopy, 0.66),
              s2: { x: 0, y: () => H() * 0.52 - rest(), scale: 0.88, opacity: 1 },
              s2low: { y: () => H() * 0.92 - rest(), scale: 0.8 },
            };

        // The road through the three steps. Desktop: the car drives from stop to stop. Phones: the car
        // holds the middle of the screen and the road slides under it, bringing each stop with it.
        const ratio = car.side.width / car.side.height;
        const roadW = () => (desktop ? Math.min(track.offsetWidth * 0.28, H() * 0.15 * ratio) : Math.min(W() * 0.74, H() * 0.13 * ratio, 440));
        const roadScale = () => roadW() / carEl.offsetWidth;
        const roadY = () => road.offsetTop - rest() - (GROUND - 0.5) * carEl.offsetHeight * roadScale();
        const trackLeft = () => track.getBoundingClientRect().left - Number(gsap.getProperty(track, "x"));
        const stopX = (i: number) => (desktop ? trackLeft() + nodes[i]!.offsetLeft - W() / 2 : 0);
        const trackX = (i: number) => (desktop ? 0 : -(nodes[i]!.offsetLeft - nodes[0]!.offsetLeft));
        const offLeft = () => -(W() / 2 + roadW() / 2 + 40);
        /** Leaving the battery scene the car is still at its large size. */
        const exitLeft = () => -(W() / 2 + (carEl.offsetWidth * S.s2low.scale) / 2 + 40);
        const offRight = () => W() / 2 + roadW() / 2 + 40;
        // Cards float just above the roof of the car parked beneath them. On phones they shrink to fit the room
        // between the heading and the car, and step aside entirely when there isn't enough.
        const head = q('[data-s="process-head"]')[0] as HTMLElement;
        const placeCards = () => {
          const roof = (GROUND - 0.05) * carEl.offsetHeight * roadScale();
          const lift = Math.round(roof + 18);
          el.style.setProperty("--lift", `${lift}px`);
          const room = road.offsetTop - lift - (head.offsetTop + head.offsetHeight) - 14;
          stepCards.forEach((card) => {
            const c = card as HTMLElement;
            const fit = Math.min(1, room / Math.max(1, c.offsetHeight));
            c.style.setProperty("--card-scale", fit.toFixed(3));
            c.toggleAttribute("data-off", fit < 0.68);
          });
        };
        placeCards();
        ScrollTrigger.addEventListener("refreshInit", placeCards);

        // How far the pack rises (in the car's own units) so its front edge lands at a set height on screen.
        const lift = () => {
          const scale = S.s2low.scale;
          const centre = carEl.offsetTop + carEl.offsetHeight / 2 + S.s2low.y();
          const slab = centre + (pack.top / 100 - 0.5) * carBox.offsetHeight * scale;
          return -(slab - H() * (desktop ? 0.6 : H() < 640 ? 0.5 : 0.56)) / scale;
        };

        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.9, invalidateOnRefresh: true },
          onUpdate: () => {
            spin();
            setStep(tl.time());
            drawTrail();
          },
        });

        // Hero → categories
        tl.to(q('[data-s="hero-copy"]'), { autoAlpha: 0, y: () => -H() * 0.06, duration: 0.5, ease: "power1.in" }, 0.1)
          .to(word, { y: () => -H() * 0.1, opacity: 0, duration: 0.75, ease: "power1.in" }, 0.05)
          .to(letters, { x: (i: number) => (i - (WORD.length - 1) / 2) * W() * 0.018, duration: 0.75 }, 0.05)
          .to(lamp, { opacity: 0, duration: 0.3 }, 0.1)
          .to(light, { opacity: 0, duration: 0.6 }, 0.15)
          .to(light, { opacity: 1, duration: 0.5 }, 1.75)
          .to(light, { opacity: 0.2, duration: 0.4 }, 2.7)
          .to(light, { opacity: 0, duration: 0.4 }, 5.6)
          .to(carEl, { ...S.s1, duration: 0.6, ease: "power2.inOut" }, 0.08)
          .fromTo(q('[data-s="cat-floor"]'), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.5)

          // Stacked layouts: the categories copy scrolls away upwards, so it fades as it leaves rather than sliding across the car.
          .to(catCopy, { autoAlpha: desktop ? 1 : 0, duration: 0.14, ease: "power1.in" }, 1.48)

          // Categories → battery: the car comes back to centre stage and grows.
          .to(q('[data-s="cat-floor"]'), { opacity: 0, duration: 0.4 }, 1.7)
          .to(carEl, { ...S.s2, duration: 0.9, ease: "power2.inOut" }, 1.7)
          .fromTo(q('[data-s="bat-a"]'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" }, 2.3)

          // Scan line sweeps the car into X-ray.
          .set(xray, { opacity: 1 }, 2.69)
          .fromTo(scan, { left: "-2%", opacity: 0 }, { left: "102%", opacity: 1, duration: 0.7, ease: "power1.inOut" }, 2.7)
          .to(scan, { opacity: 0, duration: 0.1 }, 3.32)
          .fromTo(photo, { clipPath: "inset(0% 0% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 100%)", duration: 0.7, ease: "power1.inOut" }, 2.7)
          .fromTo(xray, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power1.inOut" }, 2.7)
          .fromTo(faces, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 3.0)

          // The pack lifts out and tips towards you; charge flows through the cells.
          .to(q('[data-s="bat-a"]'), { autoAlpha: 0, y: -30, duration: 0.3, ease: "power2.in" }, 3.5)
          .to(carEl, { ...S.s2low, duration: 0.7, ease: "power2.inOut" }, 3.6)
          .to(xray, { opacity: 0.4, duration: 0.6 }, 3.6)
          .fromTo(
            plate,
            { y: 0, rotationX: 89, scale: 1, transformPerspective: 1400, transformOrigin: "50% 100%" },
            { y: lift, rotationX: 47, scale: desktop ? 1.32 : 1.5, duration: 0.75, ease: "power2.inOut" },
            3.6,
          )
          .fromTo(soh, { autoAlpha: 0, scale: 0.92 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "power2.out" }, 3.85)
          .fromTo(lit, { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: "power1.inOut" }, 3.95)
          .fromTo(
            sohValue,
            { textContent: 0 },
            { textContent: SOH, duration: 0.7, ease: "power1.out", snap: { textContent: 1 }, modifiers: { textContent: (v: string) => String(Math.round(Number(v))) } },
            3.95,
          )
          .fromTo(q('[data-s="callout"]'), { autoAlpha: 0, x: (i: number) => (i < 2 ? -16 : 16) }, { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.09, ease: "power2.out" }, 4.35)
          .fromTo(q('[data-s="bat-b"]'), { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "power2.out" }, 4.6)

          // …and settles back in.
          .to(q('[data-s="callout"]'), { autoAlpha: 0, duration: 0.25, stagger: 0.04 }, 5.05)
          .to(q('[data-s="bat-b"]'), { autoAlpha: 0, y: -24, duration: 0.3, ease: "power2.in" }, 5.1)
          .to(soh, { autoAlpha: 0, scale: 0.96, duration: 0.35 }, 5.1)
          .to(plate, { y: 0, rotationX: 89, scale: 1, duration: 0.55, ease: "power2.inOut" }, 5.15)
          .to(lit, { clipPath: "inset(0% 0% 0% 100%)", duration: 0.4 }, 5.2)
          .to(xray, { opacity: 1, duration: 0.3 }, 5.35)
          .to(faces, { opacity: 0, duration: 0.25 }, 5.62)
          .to(photo, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.45, ease: "power1.inOut" }, 5.55)
          .to(xray, { clipPath: "inset(0% 0% 0% 100%)", duration: 0.45, ease: "power1.inOut" }, 5.55)

          // Off the stage to the left, then back on the road the other way round, through the three stops.
          .to(carEl, { x: exitLeft, duration: 0.3, ease: "power2.in" }, 5.56)
          .fromTo(q('[data-s="process"]'), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25 }, 5.88)
          .fromTo(q('[data-s="process-head"] > *'), { y: 36 }, { y: 0, duration: 0.4, stagger: 0.06, ease: "power2.out" }, 5.86)
          .fromTo(steps, { y: 28 }, { y: 0, duration: 0.4, stagger: 0.05, ease: "power2.out" }, 5.92)
          .fromTo(q('[data-s="road-line"]'), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power2.inOut" }, 5.88)
          .set(carBox, { scaleX: -1 }, 5.99)
          .set(carEl, { x: offLeft, y: roadY, scale: roadScale }, 5.99)
          .to(carEl, { x: () => stopX(0), duration: 0.45, ease: "power3.out" }, 6.05)
          .fromTo(stepCards[0]!, { autoAlpha: 0, y: 18, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.2, ease: "back.out(1.7)" }, ARRIVE[0]! - 0.02)
          .to(stepCards[0]!, { autoAlpha: 0, y: -12, duration: 0.12, ease: "power1.in" }, 6.95)
          .to(desktop ? carEl : track, { x: () => (desktop ? stopX(1) : trackX(1)), duration: 0.33, ease: "power2.inOut" }, 6.97)
          .fromTo(stepCards[1]!, { autoAlpha: 0, y: 18, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.2, ease: "back.out(1.7)" }, ARRIVE[1]! - 0.02)
          .to(stepCards[1]!, { autoAlpha: 0, y: -12, duration: 0.12, ease: "power1.in" }, 7.6)
          .to(desktop ? carEl : track, { x: () => (desktop ? stopX(2) : trackX(2)), duration: 0.33, ease: "power2.inOut" }, 7.62)
          .fromTo(stepCards[2]!, { autoAlpha: 0, y: 18, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.2, ease: "back.out(1.7)" }, ARRIVE[2]! - 0.02)
          // Collected: it drives away.
          .to(carEl, { x: offRight, duration: 0.25, ease: "power2.in" }, 8.05)
          .set({}, {}, TOTAL);

        return () => {
          intro.kill();
          ScrollTrigger.removeEventListener("refreshInit", placeCards);
        };
      });
    }, el);

    return () => {
      ro.disconnect();
      ctx.revert();
    };
  }, []);

  return (
    <section ref={root} className="relative isolate bg-night-950" data-nav-theme="night" aria-label="Sell your electric vehicle">
      {/* ------------------------------------------------ the stage */}
      <div className={clsx("top-0 h-svh overflow-hidden", reduced ? "relative" : "sticky")} style={{ perspective: "1600px" }}>
        <div className="spotlight absolute inset-0" />
        <div className="absolute inset-x-0 bottom-0 h-[38%] bg-[linear-gradient(180deg,transparent,rgb(239_237_232/0.025)_40%,rgb(239_237_232/0.04))]" />

        {/* Giant backdrop word */}
        <div data-s="word" className="pointer-events-none absolute inset-x-0 top-[var(--word-top,24%)] flex justify-start overflow-hidden sm:justify-center lg:top-[15%]">
          <p className="word-drift backdrop-word flex overflow-hidden pb-[0.06em] text-[30vw] sm:text-[15vw] lg:text-[min(15.2vw,26svh)]" aria-hidden>
            {WORD.split("").map((ch, i) => (
              <span key={i} data-s="letter" className="story-letter backdrop-word-fill inline-block">
                {ch}
              </span>
            ))}
          </p>
        </div>

        {/* Battery state-of-health figure */}
        <div data-s="soh" className="invisible absolute inset-x-0 top-[12%] flex flex-col items-center opacity-0 lg:top-[7%]" aria-hidden>
          <p className="backdrop-word flex items-start text-[34vw] leading-none lg:text-[min(19vw,34svh)]">
            <span data-s="soh-value" className="bg-[linear-gradient(180deg,rgb(157_240_196/0.5),rgb(157_240_196/0.02)_85%)] bg-clip-text text-transparent tabular-nums">
              {SOH}
            </span>
            <span className="mt-[0.12em] bg-[linear-gradient(180deg,rgb(157_240_196/0.45),transparent_80%)] bg-clip-text text-[0.38em] text-transparent">%</span>
          </p>
        </div>

        {/* Showroom light: a halo behind the car and a lit floor beneath it */}
        <div
          data-s="halo"
          className="pointer-events-none absolute top-[36%] left-1/2 h-[54%] w-[100vw] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(239_237_232/0.11),rgb(239_237_232/0.035)_55%,transparent)] lg:w-[80vw]"
        />
        <div
          data-s="floor"
          className="pointer-events-none absolute top-[63%] left-1/2 h-[24%] w-[112vw] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(239_237_232/0.1),transparent)] lg:top-[65%] lg:w-[86vw]"
        />

        {/* Floor glow for the categories chapter */}
        <div data-s="cat-floor" className="absolute bottom-[8%] left-[4%] h-[30%] w-[52%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(239_237_232/0.07),transparent)] opacity-0" />

        {/* The car. Its width comes from --cw so the centring margins always match; on phones and
            tablets it's capped by the room the hero leaves (--car-max-h). */}
        <div
          data-s="car"
          className="absolute top-[var(--car-c,56%)] left-1/2 z-10 mt-[calc(var(--cw)*-0.1637)] ml-[calc(var(--cw)/-2)] w-[var(--cw)] will-change-transform [--cw:min(132vw,calc(var(--car-max-h,200svh)*var(--ar)))] sm:top-[var(--car-c,55%)] sm:[--cw:min(100vw,calc(var(--car-max-h,200svh)*var(--ar)))] md:[--cw:min(92vw,calc(var(--car-max-h,200svh)*var(--ar)))] lg:top-[54%] lg:[--cw:min(78vw,124svh)]"
          style={{ "--ar": car.side.width / car.side.height } as React.CSSProperties}
        >
          <div data-s="car-intro" className={clsx("story-car relative transition-opacity duration-500", hoverShot && "lg:opacity-0")}>
            <div data-s="car-box" className="relative" style={{ aspectRatio: `${car.side.width} / ${car.side.height}` }}>
              {/* contact shadow and a faint floor reflection */}
              <div className="absolute inset-x-[6%] bottom-[-3%] h-[10%] rounded-[50%] bg-black/80 blur-[14px]" />
              <div className="absolute inset-x-[12%] bottom-[-1%] h-[4%] rounded-[50%] bg-black blur-[5px]" />
              <div className="pointer-events-none absolute inset-x-0 top-[99%] hidden h-[45%] -scale-y-100 opacity-[0.06] [mask-image:linear-gradient(to_top,black,transparent_40%)] lg:block" aria-hidden>
                <Image src={car.side} alt="" sizes="78vw" className="h-auto w-full" />
              </div>

              <div data-s="photo" className="absolute inset-0">
                <Image
                  src={car.side}
                  alt={car.alt}
                  loading="eager"
                  fetchPriority="high"
                  quality={85}
                  sizes="(min-width: 1024px) min(78vw, 124svh), (min-width: 768px) 92vw, (min-width: 640px) 100vw, 132vw"
                  className="h-auto w-full select-none"
                  draggable={false}
                />
                {(["front", "rear"] as const).map((k) => {
                  const r = car.rims[k];
                  return (
                    <div
                      key={k}
                      className="absolute"
                      style={{ left: `${r.cx - r.d / 2}%`, top: `${r.cy - (r.d / 2) * (car.side.width / car.side.height)}%`, width: `${r.d}%`, aspectRatio: "1" }}
                    >
                      {r.under ? <Image src={r.under} alt="" sizes="12vw" quality={85} className="absolute inset-0 h-full w-full" draggable={false} /> : null}
                      <Image data-s="rim" src={r.src} alt="" sizes="12vw" quality={85} className="relative h-full w-full will-change-transform" draggable={false} />
                    </div>
                  );
                })}
                <div
                  data-s="lamp"
                  className="pointer-events-none absolute h-[12%] w-[10%] rounded-full bg-[radial-gradient(closest-side,rgb(220_240_255/0.95),rgb(160_210_255/0.35)_45%,transparent)] opacity-0 mix-blend-screen"
                  style={{ left: `${lampAt.x - 5}%`, top: `${lampAt.y - 6}%` }}
                />
              </div>

              <div data-s="xray" className="absolute inset-0 opacity-0" style={{ clipPath: "inset(0% 100% 0% 0%)" }} aria-hidden>
                <Image src={car.xray} alt="" sizes="(min-width: 1024px) 78vw, 132vw" className="h-auto w-full" />
              </div>

              {/* Battery: a slab under the floor that lifts out and tips towards you */}
              <div
                data-s="pack"
                className="absolute [&_[data-s=face]]:opacity-0 [&_[data-s=plate]]:opacity-0"
                style={{ left: `${pack.left}%`, top: `${pack.top}%`, width: `${pack.width}%`, height: `${pack.height}%` }}
                aria-hidden
              >
                <BatteryPack />
              </div>

              <div data-s="scan" className="pointer-events-none absolute top-[-8%] bottom-[-6%] w-[2px] -translate-x-1/2 bg-ion opacity-0 shadow-[0_0_24px_6px_rgb(157_240_196/0.55)]" aria-hidden />
            </div>
          </div>
        </div>

        {/* Overlays laid out on the same grid as the text, so nothing drifts out of frame on any screen */}
        <div className="pointer-events-none absolute inset-0 z-20 hidden lg:block" aria-hidden>
          <div className="container-page grid h-full grid-cols-2">
            {/* Other vehicles, shown while hovering the categories */}
            <div className="relative">
              {categories.map(({ key, side }) =>
                side ? (
                  <div
                    key={key}
                    className={clsx(
                      "absolute inset-x-0 top-[24%] bottom-[18%] flex items-center justify-center transition-[opacity,translate,scale] duration-700 ease-glide",
                      hover === key ? "translate-x-0 scale-100 opacity-100" : "-translate-x-6 scale-[0.97] opacity-0",
                    )}
                  >
                    <Image src={side} alt="" sizes="44vw" quality={85} className="h-auto max-h-full w-auto max-w-[94%] object-contain" />
                  </div>
                ) : null,
              )}
            </div>
            <div />
          </div>
        </div>

        {/* What we read from a battery, around the lifted pack */}
        <div className="pointer-events-none absolute inset-0 z-20 hidden lg:block" aria-hidden>
          <div className="container-page relative h-full">
            {callouts.map((c) => (
              <div
                key={c.k}
                data-s="callout"
                className={clsx("invisible absolute w-[min(19rem,22vw)] opacity-0", c.top, c.side === "left" ? "left-[clamp(1rem,0.25rem+3.2vw,2.5rem)] text-right" : "right-[clamp(1rem,0.25rem+3.2vw,2.5rem)] text-left")}
              >
                <p className={clsx("label flex items-center gap-2 text-ion", c.side === "left" ? "justify-end" : "justify-start")}>
                  {c.side === "right" ? <span className="h-px w-8 bg-ion/60" /> : null}
                  {c.k}
                  {c.side === "left" ? <span className="h-px w-8 bg-ion/60" /> : null}
                </p>
                <p className="mt-1.5 text-[0.85rem] leading-snug text-chalk-2">{c.v}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Battery chapter copy lives on the stage */}
        <div data-s="bat-a" className="invisible absolute top-[15%] left-0 z-20 w-full opacity-0 lg:top-[17%]">
          <div className="container-page">
            <div className="max-w-[34rem]">
              <p className="eyebrow flex items-center gap-2.5 text-ion">
                <span className="ion-dot" /> The part that matters
              </p>
              <h2 className="display mt-4 text-d2">
                The battery <em>is the car.</em>
              </h2>
              <p className="mt-4 max-w-md text-lead text-chalk-2 short:hidden">It&apos;s the most valuable thing an electric vehicle owns, and the one thing an instant valuation can&apos;t see.</p>
            </div>
          </div>
        </div>
        <div data-s="bat-b" className="invisible absolute bottom-[max(13%,5.75rem)] left-0 z-20 w-full opacity-0 lg:bottom-[8%]">
          <div className="container-page flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-[30rem]">
              <h3 className="display text-d3 short:text-[1.35rem]">
                We price its health, <em>not just its mileage.</em>
              </h3>
              <p className="mt-3 text-chalk-2 short:hidden">Add a battery health figure to your quote and a well-kept battery gets paid for.</p>
            </div>
            <Cta href="/quote" variant="ion" size="lg">
              Add my battery health
            </Cta>
          </div>
        </div>

        {/* Process: a road through the three steps. Each stop has its card above the parked car and its
            words below the road. Desktop shows all three stops; on phones the road slides under the car. */}
        {reduced ? null : (
          <div data-s="process" className="pointer-events-none invisible absolute inset-0 z-20 opacity-0">
            <div data-s="process-head" className="container-page flex flex-col gap-3 pt-[clamp(5.5rem,12svh,8rem)] short:pt-[4.6rem] lg:flex-row lg:items-end lg:justify-between">
              <h2 className="display text-d2 short:text-[1.65rem]">
                Three steps. <em>One firm offer.</em>
              </h2>
              <Link href="/how-it-works" className="label chev-link pointer-events-auto self-start text-chalk-2 hover:text-chalk lg:self-auto lg:pb-2">
                More on how it works <Chevron />
              </Link>
            </div>
            <div data-s="road" className="absolute inset-x-0 top-[57%] short:top-[54%] lg:top-[64%]">
              <div className="lg:container-page">
                <div data-s="track" className="relative w-[300vw] lg:w-full">
                  <div data-s="road-line" className="absolute inset-x-0 top-0 h-px origin-left bg-[linear-gradient(90deg,transparent,rgb(239_237_232/0.24)_5%,rgb(239_237_232/0.24)_95%,transparent)]" />
                  <div data-s="trail" className="absolute top-[-0.5px] left-0 h-[2px] w-0 rounded-full bg-[linear-gradient(90deg,transparent,var(--color-ion)_10%)] shadow-[0_0_14px_rgb(157_240_196/0.5)]" />
                  {processSteps.map((step, i) => (
                    <div
                      key={step.title}
                      data-s="node"
                      className="group absolute top-0 left-[calc(50vw_+_var(--k)*100vw)] lg:left-[calc((var(--k)*2_+_1)*100%/6)]"
                      style={{ "--k": i } as React.CSSProperties}
                    >
                      <span className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-night-950 ring-1 ring-chalk/35 transition-[background-color,box-shadow] duration-500 group-data-[lit]:bg-ion group-data-[lit]:shadow-[0_0_0_6px_rgb(157_240_196/0.14),0_0_18px_rgb(157_240_196/0.6)] group-data-[lit]:ring-ion" />
                      <div data-s="step-card" className="invisible absolute bottom-[var(--lift,9rem)] left-0 w-[min(19rem,84vw)] -translate-x-1/2 opacity-0 short:hidden">
                        <div className="origin-bottom [scale:var(--card-scale,1)]">
                          <StepCard i={i} />
                        </div>
                      </div>
                      <div
                        data-s="step"
                        data-active={i === 0 ? true : undefined}
                        className="group/step absolute top-7 left-0 w-[min(22rem,80vw)] -translate-x-1/2 text-center short:top-5 lg:top-9 lg:w-[min(22rem,26vw)]"
                      >
                        <p className="font-display text-[0.78rem] font-semibold tracking-[0.14em] text-chalk-3 tabular-nums transition-colors duration-500 group-data-[active]/step:text-ion">0{i + 1}</p>
                        <h3 className="mt-2 font-display text-[clamp(1.3rem,1.1rem+0.7vw,1.65rem)] leading-tight font-medium tracking-[-0.025em] text-chalk-3 transition-colors duration-500 group-data-[active]/step:text-chalk">
                          {step.title}
                        </h3>
                        <p className="mt-2 text-[0.92rem] leading-relaxed text-chalk-3 transition-colors duration-500 group-data-[active]/step:text-chalk-2 short:line-clamp-3">{step.body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ------------------------------------------------ the chapters that scroll past */}
      <div className="relative z-30 -mt-[100svh]">
        {/* Hero: headline on the left, registration on the right. Nothing else, so the car leads. */}
        <div
          data-s="hero-copy"
          className="container-page relative flex h-svh flex-col justify-between gap-6 pt-[6.5rem] pb-[max(1.25rem,3svh)] short:gap-4 short:pt-[5.25rem] lg:flex-row lg:items-end lg:gap-10 lg:pt-0 lg:pb-[6svh]"
        >
          <h1 className="display max-w-[20ch] text-[clamp(2rem,1.4rem+2.2vw,3.25rem)] leading-[1.02] sm:max-w-[24ch] short:text-[1.75rem]">
            Sell your electric car to people who <em>understand it.</em>
          </h1>
          {/* The room the word and the car are fitted into on phones and tablets */}
          <div data-s="band" className="min-h-0 flex-1 lg:hidden" aria-hidden />
          <div className="w-full sm:max-w-[30rem] lg:w-[27rem] lg:flex-none">
            <RegEntry location="home-hero" className="short:[&_label]:sr-only" />
            <HeroTrust />
          </div>
        </div>

        {/* Categories */}
        <div className={clsx("relative", reduced ? "py-24" : "")} style={reduced ? undefined : { height: `${CH.categories}svh` }}>
          <div className={clsx("flex items-end lg:items-center", reduced ? "" : "sticky top-0 h-svh pb-24 lg:pb-0")}>
            <div className="container-page grid lg:grid-cols-2">
              <div data-s="slot-categories" className="hidden items-center pr-10 lg:flex">
                {reduced ? <Image src={car.side} alt={car.alt} sizes="45vw" className="h-auto w-full" /> : null}
              </div>
              <div data-s="cat-copy" className="rounded-3xl bg-night-950/70 p-1 backdrop-blur-sm sm:max-w-xl lg:max-w-none lg:bg-transparent lg:p-0 lg:pl-6 lg:backdrop-blur-none xl:pl-12">
                <h2 className="display max-w-[16ch] text-d2">
                  One buyer for <em>every</em> electric vehicle.
                </h2>
                <ul className="mt-6 border-t hairline lg:mt-10" onMouseLeave={() => setHover(null)}>
                  {categories.map((c) => (
                    <li key={c.href} className="border-b hairline">
                      <Link
                        href={c.href}
                        className="group grid grid-cols-[1fr_auto] items-center gap-4 py-4 lg:py-6"
                        onMouseEnter={() => setHover(c.key)}
                        onFocus={() => setHover(c.key)}
                        onBlur={() => setHover(null)}
                      >
                        <span>
                          <span className="block font-display text-[clamp(1.5rem,1.1rem+1.6vw,2.6rem)] leading-none font-medium tracking-[-0.035em] transition-transform duration-500 ease-glide group-hover:translate-x-2">
                            {c.title}
                          </span>
                          <span className="mt-2 block text-[0.92rem] text-chalk-3">{c.detail}</span>
                        </span>
                        <span className="chip bg-chalk text-night-950 group-hover:translate-x-1">
                          <Chevron />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Battery: the stage does the talking; this is scroll length. */}
        {reduced ? <BatteryStatic /> : <div className="pointer-events-none" style={{ height: `${CH.battery}svh` }} aria-hidden />}

        {/* Process: the stage does the talking; this is scroll length. */}
        {reduced ? <ProcessStatic /> : <div className="pointer-events-none" style={{ height: `${CH.process}svh` }} aria-hidden />}
      </div>
    </section>
  );
}

function HeroTrust() {
  const p = site.promises;
  const items = [p.noFees && "No fees", p.freeCollection && "Free collection", p.paidBeforeCollection && "Paid before we collect"].filter(Boolean) as string[];
  return (
    <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8rem] text-chalk-3 short:hidden">
      <span className="flex items-center gap-2 text-chalk-2">
        <span className="ion-dot" /> Specialists online now
      </span>
      {items.map((t) => (
        <span key={t}>{t}</span>
      ))}
    </p>
  );
}

/** The battery chapter for visitors who prefer less motion: the X-ray, still. */
function BatteryStatic() {
  return (
    <div className="container-page py-24">
      <p className="eyebrow flex items-center gap-2.5 text-ion">
        <span className="ion-dot" /> The part that matters
      </p>
      <h2 className="display mt-4 text-d2">
        The battery <em>is the car.</em>
      </h2>
      <p className="mt-4 max-w-xl text-lead text-chalk-2">
        It&apos;s the most valuable thing an electric vehicle owns, and the one thing an instant valuation can&apos;t see. We price its health, not just its mileage.
      </p>
      <Image src={car.xray} alt={`X-ray drawing of a ${car.name}, showing where the battery sits under the floor`} sizes="90vw" className="mt-10 h-auto w-full" />
      <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {callouts.map((c) => (
          <li key={c.k}>
            <p className="label text-ion">{c.k}</p>
            <p className="mt-2 text-[0.92rem] text-chalk-2">{c.v}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const check = (
  <svg viewBox="0 0 16 16" className="size-[1em]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="m3.5 8.5 3 3 6-7" />
  </svg>
);

/** What each step looks like from your side: the details you send, the offer that comes back, the money arriving. */
function StepCard({ i }: { i: number }) {
  const shadow = "shadow-[0_1.5rem_3.5rem_-1rem_rgb(0_0_0/0.75)]";
  if (i === 0) {
    return (
      <div className={clsx("rounded-[1.4rem] bg-night-800/95 p-4 ring-1 ring-chalk/10 backdrop-blur", shadow)}>
        <div className="flex items-center justify-between gap-3">
          <Plate reg="AB12 CDE" size="sm" tone="front" />
          <span className="text-[0.72rem] text-chalk-3">2 minutes</span>
        </div>
        <p className="mt-3 font-display text-[1.05rem] font-semibold tracking-[-0.01em]">Tesla Model S Long Range</p>
        <p className="mt-0.5 text-[0.82rem] text-chalk-3">2020 · 38,600 miles · Battery health 91%</p>
        <p className="mt-3 flex items-center gap-2 border-t hairline pt-3 text-[0.8rem] text-chalk-2">
          <span className="text-ion">{check}</span> 6 photos added
        </p>
      </div>
    );
  }
  if (i === 1) {
    return (
      <div className={clsx("rounded-[1.4rem] bg-[#0f1a15] p-3 ring-1 ring-ion/15", shadow)}>
        <div className="flex items-center gap-2 px-1 pb-2 text-[0.72rem] text-chalk-3">
          <span className="ion-dot" /> WhatsApp · {site.brand.name}
        </div>
        <div className="rounded-2xl rounded-tl-md bg-[#1c2b25] p-4 text-left text-[0.88rem] leading-snug text-chalk">
          Hi Sam, thanks for the photos. Our firm offer for your Model S is
          <span className="mt-2 block font-display text-[1.9rem] leading-none font-semibold tracking-[-0.03em] text-ion tabular-nums">£28,950</span>
          <span className="mt-2 block text-[0.72rem] text-chalk-3">Valid for {site.promises.offerValidDays} days · Example offer</span>
        </div>
      </div>
    );
  }
  return (
    <div className={clsx("rounded-[1.4rem] bg-chalk p-4 text-left text-carbon", shadow)}>
      <div className="flex items-center gap-3">
        <span className="flex size-10 flex-none items-center justify-center rounded-full bg-ion-deep text-[1.15rem] text-pearl-50">{check}</span>
        <span>
          <span className="block font-display font-semibold">Payment received</span>
          <span className="block text-[0.82rem] text-carbon-2">£28,950 by bank transfer</span>
        </span>
      </div>
      <p className="mt-3 border-t border-carbon/10 pt-3 text-[0.8rem] text-carbon-2">Collection booked · Thursday, 10:00</p>
    </div>
  );
}

/** The three steps for visitors who prefer less motion: the same cards and words, side by side. */
function ProcessStatic() {
  return (
    <div className="container-page py-24">
      <h2 className="display text-d2">
        Three steps. <em>One firm offer.</em>
      </h2>
      <ol className="mt-12 grid gap-12 lg:grid-cols-3 lg:gap-8">
        {processSteps.map((step, i) => (
          <li key={step.title}>
            <div className="flex max-w-[19rem] items-end lg:h-[12rem]">
              <div className="w-full">
                <StepCard i={i} />
              </div>
            </div>
            <p className="mt-8 font-display text-[0.78rem] font-semibold tracking-[0.14em] text-ion tabular-nums">0{i + 1}</p>
            <h3 className="mt-2 font-display text-[1.5rem] leading-tight font-medium tracking-[-0.025em]">{step.title}</h3>
            <p className="mt-2 max-w-md leading-relaxed text-chalk-2">{step.body}</p>
          </li>
        ))}
      </ol>
      <Link href="/how-it-works" className="label chev-link mt-10 text-chalk-2 hover:text-chalk">
        More on how it works <Chevron />
      </Link>
    </div>
  );
}
