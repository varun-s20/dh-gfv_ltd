"use client";

import { clsx } from "clsx";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Chevron } from "@/components/ui/primitives";
import { FLEET_MAX_LENGTH, type FleetVehicle } from "@/content/fleet";
import { ScrollTrigger, gsap, prefersReducedMotion } from "@/lib/motion";

/** Pixels of drag per step round the vehicle. */
const STEP_PX = 56;

const viewName: Record<number, string> = {
  0: "Side",
  45: "Front three-quarter",
  90: "Front",
  135: "Front three-quarter",
  180: "Other side",
  225: "Rear three-quarter",
  270: "Rear",
  315: "Rear three-quarter",
};

/**
 * The rolling list from zoox.com ("Workspace, Chill Space, Photo Booth…"):
 * names glide up through a fixed window as you scroll, the one in focus in
 * full ink, and the vehicle beside it changes to match. Every vehicle arrives
 * side-on, facing the same way, and can be dragged round to see it from every side.
 */
export function WeBuy({ vehicles }: { vehicles: FleetVehicle[] }) {
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = root.current;
    const ul = list.current;
    if (!el || !ul || prefersReducedMotion()) return;
    const rows = Array.from(ul.children) as HTMLElement[];
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: el,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          const pos = self.progress * (rows.length - 1);
          const i = Math.round(pos);
          const rowH = rows[0]!.offsetHeight;
          gsap.set(ul, { y: -pos * rowH });
          setActive((prev) => (prev === i ? prev : i));
        },
      });
    }, el);
    return () => ctx.revert();
  }, []);

  const vehicle = vehicles[active] ?? vehicles[0]!;

  return (
    <section ref={root} className="on-pearl sheet relative h-[400svh] motion-reduce:h-auto" data-nav-theme="pearl">
      <div className="sticky top-0 flex h-svh items-center overflow-hidden max-lg:pb-[5rem] motion-reduce:relative motion-reduce:py-24">
        <div className="container-page grid w-full items-center gap-4 lg:grid-cols-[0.72fr_1.28fr] lg:gap-8">
          <div className="relative z-10 order-2 lg:order-1">
            <p className="eyebrow text-carbon-3">If it plugs in, we buy it</p>
            <div className="relative mt-4 h-[11.5rem] overflow-hidden [mask-image:linear-gradient(transparent,black_30%,black_70%,transparent)] sm:h-[14rem] lg:mt-6 lg:h-[22rem] motion-reduce:h-auto motion-reduce:[mask-image:none]">
              <ul ref={list} className="absolute inset-x-0 top-[calc(50%-1.75rem)] sm:top-[calc(50%-2.2rem)] motion-reduce:static">
                {vehicles.map((v, i) => (
                  <li
                    key={v.slug}
                    className={clsx(
                      "flex h-14 items-center font-display text-[clamp(1.8rem,1.1rem+1.9vw,3rem)] leading-none font-medium tracking-[-0.04em] whitespace-nowrap transition-colors duration-300 sm:h-[4.4rem]",
                      i === active ? "text-carbon" : "text-carbon/50",
                    )}
                  >
                    {v.name}
                  </li>
                ))}
              </ul>
            </div>
            <Link href="/brands" className="label chev-link mt-6 text-carbon md:mt-8">
              Every make we buy <Chevron />
            </Link>
          </div>
          <div className="order-1 mx-auto w-full max-lg:max-w-[calc(48svh*1.7)] lg:order-2">
            <Turntable vehicles={vehicles} active={active} caption={`${vehicle.name} · ${vehicle.kind === "van" ? "electric van" : "electric car"}`} />
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The vehicle stage. Vehicles are drawn to scale against each other (a small
 * car is shorter than a van) and every view of one vehicle shares its canvas,
 * so the floor line and size hold steady as it turns.
 */
function Turntable({ vehicles, active, caption }: { vehicles: FleetVehicle[]; active: number; caption: string }) {
  const [step, setStep] = useState(0);
  const [turned, setTurned] = useState(false);
  /** Degrees turned so far, unwrapped, so the dial always turns the short way. */
  const [spin, setSpin] = useState(0);
  const drag = useRef<{ id: number; x: number; acc: number } | null>(null);
  const vehicle = vehicles[active] ?? vehicles[0]!;
  const views = vehicle.views;
  const view = views[step % views.length] ?? views[0]!;

  // Each vehicle arrives side-on.
  const [shownFor, setShownFor] = useState(active);
  if (shownFor !== active) {
    setShownFor(active);
    setStep(0);
    setSpin((d) => Math.round(d / 360) * 360);
  }

  const turn = (by: number) => {
    const next = (((step + by) % views.length) + views.length) % views.length;
    let delta = (views[next]!.angle - views[step]!.angle + 360) % 360;
    if (by < 0) delta -= 360;
    if (Math.abs(by) > 1) delta = by * (360 / views.length);
    setTurned(true);
    setStep(next);
    setSpin((d) => d + delta);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { id: e.pointerId, x: e.clientX, acc: 0 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    d.acc += e.clientX - d.x;
    d.x = e.clientX;
    if (Math.abs(d.acc) >= STEP_PX) {
      if (!(e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      const n = Math.trunc(d.acc / STEP_PX);
      d.acc -= n * STEP_PX;
      turn(n);
    }
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div>
      <div
        role="group"
        aria-roledescription="360 degree view"
        aria-label={`${vehicle.name}, ${viewName[view.angle]?.toLowerCase() ?? "side"} view`}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") turn(1);
          else if (e.key === "ArrowLeft") turn(-1);
          else return;
          e.preventDefault();
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative aspect-[16/9] w-full cursor-grab touch-pan-y select-none focus-visible:rounded-3xl active:cursor-grabbing md:aspect-[16/10]"
      >
        <div className="absolute inset-x-[2%] bottom-[9%] h-[16%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(13_15_18/0.18),transparent)]" />
        {vehicles.map((v, i) => {
          const current = i === active;
          return (
            <div
              key={v.slug}
              aria-hidden={!current}
              className={clsx(
                "absolute bottom-[14%] left-1/2 -translate-x-1/2 transition-[opacity,translate,scale] duration-700 ease-glide",
                current ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.97] opacity-0",
              )}
              style={{
                width: `${Math.min(100, ((v.length / FLEET_MAX_LENGTH) * 94) / v.sideFrac)}%`,
                aspectRatio: `${v.views[0]!.src.width} / ${v.views[0]!.src.height}`,
              }}
            >
              {(current ? v.views : v.views.slice(0, 1)).map((vw, k) => {
                const shown = current ? k === step : k === 0;
                return (
                  <Image
                    key={vw.angle}
                    src={vw.src}
                    alt={shown && current ? `${v.alt}, ${viewName[vw.angle]?.toLowerCase() ?? "side"} view` : ""}
                    sizes="(min-width: 1024px) 52vw, (min-width: 768px) 56vw, 94vw"
                    quality={75}
                    draggable={false}
                    className={clsx(
                      "pointer-events-none absolute inset-0 h-full w-full object-contain object-bottom transition-[opacity,scale] duration-300 ease-out",
                      shown ? "scale-x-100 opacity-100" : "scale-x-[0.94] opacity-0",
                    )}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="label hidden min-w-0 truncate text-carbon-3 sm:block">{caption}</p>
        <div className="flex min-w-0 items-center gap-2.5 sm:flex-none">
          <button type="button" onClick={() => turn(-1)} aria-label="Turn the vehicle left" className="chip bg-carbon/[0.06] text-carbon transition-colors hover:bg-carbon/10">
            <Chevron direction="left" />
          </button>
          <Dial spin={spin} count={views.length} index={step % views.length} />
          <button type="button" onClick={() => turn(1)} aria-label="Turn the vehicle right" className="chip bg-carbon/[0.06] text-carbon transition-colors hover:bg-carbon/10">
            <Chevron />
          </button>
          <p className="label min-w-0 text-carbon-3 sm:w-[10.5rem] sm:whitespace-nowrap" aria-live="polite">
            {turned ? viewName[view.angle] : "Drag to turn"}
          </p>
        </div>
      </div>
    </div>
  );
}

/** A little top-down car in a ring, turned to the angle on show (you look up from the bottom of the ring). */
function Dial({ spin, count, index }: { spin: number; count: number; index: number }) {
  return (
    <span className="relative inline-flex size-10 items-center justify-center" aria-hidden>
      <svg viewBox="0 0 40 40" className="absolute inset-0 size-full">
        {Array.from({ length: count }, (_, i) => {
          const a = (i / count) * Math.PI * 2 - Math.PI / 2;
          return <circle key={i} cx={20 + Math.cos(a) * 17} cy={20 + Math.sin(a) * 17} r={i === index ? 2.1 : 1.3} className={i === index ? "fill-carbon" : "fill-carbon/30"} />;
        })}
      </svg>
      <svg viewBox="0 0 12 24" className="h-5 w-2.5 transition-transform duration-500 ease-glide" style={{ transform: `rotate(${-90 - spin}deg)` }}>
        <rect x="1" y="1" width="10" height="22" rx="4.5" className="fill-carbon" />
        <rect x="2.6" y="5.2" width="6.8" height="4" rx="1.4" className="fill-pearl-100" />
        <rect x="2.6" y="16" width="6.8" height="3" rx="1.2" className="fill-pearl-100/70" />
      </svg>
    </span>
  );
}
