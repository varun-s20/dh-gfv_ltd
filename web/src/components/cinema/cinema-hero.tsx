"use client";

import { clsx } from "clsx";
import Image, { type StaticImageData } from "next/image";
import { useEffect, useLayoutEffect, useRef } from "react";
import { SideCar, wheelSpinner } from "@/components/cars/side-car";
import { Em } from "@/components/ui/primitives";
import { shots, type ShotKey, type SideCar as SideCarData } from "@/content/cars";
import { gsap, prefersReducedMotion } from "@/lib/motion";

const useIsoLayoutEffect = typeof window === "undefined" ? useEffect : useLayoutEffect;

export type CinemaVisual =
  | { kind: "side"; car: SideCarData }
  | { kind: "xray"; car: SideCarData }
  | { kind: "shot"; shot: ShotKey; width?: string }
  | { kind: "cutout"; src: StaticImageData; alt: string; width?: string }
  | { kind: "photo"; src: StaticImageData; alt: string };

/**
 * The opening of every inner page: a giant word behind a vehicle under a
 * showroom light, the title set low on the left. The car arrives on load and
 * drifts away with parallax as you scroll, so the page opens like the home page.
 */
export function CinemaHero({
  label,
  title,
  sub,
  word,
  visual,
  children,
  short,
}: {
  label: string;
  title: string;
  sub?: string;
  word: string;
  visual?: CinemaVisual;
  children?: React.ReactNode;
  /** A lower hero for utility pages. */
  short?: boolean;
}) {
  const root = useRef<HTMLElement>(null);
  const letters = word.toUpperCase().split("");

  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    document.documentElement.classList.remove("story-intro");
    if (prefersReducedMotion()) return;
    const q = gsap.utils.selector(el);
    const vis = q('[data-s="visual"]')[0] as HTMLElement | undefined;
    const glide = q('[data-s="glide"]')[0] as HTMLElement | undefined;
    const ctx = gsap.context(() => {
      const W = () => window.innerWidth;
      const H = () => window.innerHeight;
      const spin = visual?.kind === "side" && glide ? wheelSpinner(glide, visual.car, () => Number(gsap.getProperty(glide, "x"))) : () => {};
      const intro = gsap.timeline({ delay: 0.05 });
      intro
        .fromTo(q('[data-s="letter"]'), { yPercent: 108 }, { yPercent: 0, duration: 1.2, ease: "expo.out", stagger: 0.05 }, 0)
        .fromTo(q('[data-s="copy"] > *'), { y: 26, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 1, ease: "power3.out", stagger: 0.08 }, 0.35);
      const light = q('[data-s="light"]');
      if (light.length) intro.fromTo(light, { opacity: 0 }, { opacity: 1, duration: 1.4, ease: "power2.out" }, 0.1);
      if (glide && visual) {
        if (visual.kind === "side") intro.fromTo(glide, { x: () => W() * 0.9 }, { x: 0, duration: 2, ease: "power3.out", onUpdate: spin }, 0.2);
        else if (visual.kind === "photo") intro.fromTo(glide, { scale: 1.12, opacity: 0 }, { scale: 1, opacity: 1, duration: 2.2, ease: "power3.out" }, 0);
        else intro.fromTo(glide, { x: () => W() * 0.14, opacity: 0, scale: 0.94 }, { x: 0, opacity: 1, scale: 1, duration: 1.7, ease: "power3.out" }, 0.2);
      }
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.6, invalidateOnRefresh: true },
      });
      tl.to(q('[data-s="word"]'), { yPercent: -45, opacity: 0.2 }, 0)
        .to(q('[data-s="copy"]'), { y: () => -H() * 0.12, opacity: 0 }, 0);
      if (vis && visual) {
        if (visual.kind === "photo") tl.to(vis, { yPercent: 18, scale: 1.06 }, 0);
        else tl.to(vis, { y: () => -H() * 0.08, x: () => (visual.kind === "side" ? -W() * 0.22 : 0), scale: 0.92 }, 0);
      }
      return () => intro.kill();
    }, el);
    return () => ctx.revert();
  }, [visual]);

  const isPhoto = visual?.kind === "photo";

  return (
    <section
      ref={root}
      className={clsx("relative isolate overflow-hidden bg-night-950", short ? (visual ? "h-[84svh] min-h-[38rem]" : "h-[52svh] min-h-[24rem] sm:h-[58svh] sm:min-h-[28rem]") : "h-svh min-h-[40rem]")}
      data-nav-theme="night"
    >
      {visual?.kind === "photo" ? (
        <div data-s="visual" className="absolute inset-0">
          <div data-s="glide" className="absolute inset-0">
            <Image src={visual.src} alt={visual.alt} fill loading="eager" fetchPriority="high" sizes="100vw" quality={85} className="object-cover" />
          </div>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(5_6_7/0.75),rgb(5_6_7/0.35)_35%,rgb(5_6_7/0.55)_60%,rgb(5_6_7/0.97)),linear-gradient(90deg,rgb(5_6_7/0.7),transparent_65%)]" />
        </div>
      ) : (
        <div className="spotlight absolute inset-0" />
      )}

      <div data-s="word" className={clsx("pointer-events-none absolute inset-x-0 flex justify-center overflow-hidden", isPhoto ? "top-[20%]" : !visual ? "top-[24%] sm:top-[22%]" : short ? "top-[16%]" : "top-[18%] lg:top-[14%]")}>
        <p
          className={clsx("backdrop-word flex overflow-hidden pb-[0.06em]", isPhoto && "opacity-70")}
          style={{ fontSize: `min(${Math.min(30, 92 / (letters.length * 0.84))}vw, ${short ? 34 : 42}svh)` }}
          aria-hidden
        >
          {letters.map((ch, i) => (
            <span key={i} data-s="letter" className="backdrop-word-fill inline-block">
              {ch === " " ? " " : ch}
            </span>
          ))}
        </p>
      </div>

      {visual && visual.kind !== "photo" ? (
        <>
          <div aria-hidden data-s="light" className="pointer-events-none absolute inset-0">
            <div className="absolute top-[30%] left-1/2 h-[60%] w-[100vw] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(239_237_232/0.12),rgb(239_237_232/0.035)_55%,transparent)] lg:w-[76vw]" />
            <div className="absolute top-[60%] left-1/2 h-[24%] w-[112vw] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgb(239_237_232/0.1),transparent)] lg:w-[80vw]" />
          </div>
          <div
            data-s="visual"
            className={clsx(
              "absolute left-1/2 z-10 -translate-x-1/2 -translate-y-1/2",
              short ? "top-[44%] short:top-[38%]" : "top-[46%] short:top-[38%] lg:top-[45%]",
              visual.kind === "shot" || visual.kind === "cutout"
                ? (visual.width ?? "w-[94vw] sm:w-[86vw] md:w-[80vw] lg:w-[min(56vw,90svh)]")
                : short
                  ? "w-[96vw] sm:w-[92vw] md:w-[88vw] lg:w-[min(60vw,96svh)]"
                  : "w-[96vw] sm:w-[94vw] md:w-[90vw] lg:w-[min(70vw,112svh)]",
            )}
          >
            <div data-s="glide" className="relative">
              {visual.kind === "side" ? (
                <SideCar car={visual.car} priority sizes="(min-width: 1024px) 70vw, 126vw" />
              ) : visual.kind === "xray" ? (
                <Image src={visual.car.xray} alt={`X-ray drawing of an ${visual.car.name}`} loading="eager" sizes="(min-width: 1024px) 70vw, 126vw" className="h-auto w-full" />
              ) : (
                <>
                  <div className="absolute inset-x-[10%] bottom-0 h-[9%] rounded-[50%] bg-black/80 blur-[18px]" />
                  <Image
                    src={visual.kind === "shot" ? shots[visual.shot].src : visual.src}
                    alt={visual.kind === "shot" ? shots[visual.shot].alt : visual.alt}
                    loading="eager"
                    fetchPriority="high"
                    quality={85}
                    sizes="(min-width: 1024px) 56vw, 110vw"
                    className="relative h-auto w-full"
                  />
                </>
              )}
            </div>
          </div>
        </>
      ) : null}

      <div className="absolute inset-x-0 bottom-0 z-20">
        <div data-s="copy" className="container-page flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between" style={{ paddingBottom: "calc(max(1.5rem, 4svh) + var(--sheet-r))" }}>
          <div className="max-w-[44rem]">
            <p className="eyebrow flex items-center gap-2.5 text-chalk-2">
              <span className="ion-dot" />
              {label}
            </p>
            <h1 className="display mt-4 text-[clamp(2.2rem,1.4rem+3vw,4.25rem)] leading-[0.98]">
              <Em text={title} />
            </h1>
            {sub ? <p className="mt-4 max-w-[32rem] text-[1.02rem] leading-relaxed text-chalk-2">{sub}</p> : null}
          </div>
          {children ? <div className="w-full lg:w-auto lg:flex-none">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
