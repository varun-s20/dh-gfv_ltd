"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { SideCar, wheelSpinner } from "@/components/cars/side-car";
import { heroCar } from "@/content/cars";
import { ScrollTrigger, gsap, prefersReducedMotion } from "@/lib/motion";

/**
 * The site's car, parked under the footer. As the page lifts away it rolls in
 * from the right and pulls up on a lit floor in front of the backdrop word, its
 * wheels turning until it stops.
 */
export function ParkedCar() {
  const root = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    const car = body.current;
    const reveal = el?.closest(".footer-reveal");
    if (!el || !car || !reveal || prefersReducedMotion()) return;
    const spin = wheelSpinner(car, heroCar, () => Number(gsap.getProperty(car, "x")));
    const ctx = gsap.context(() => {
      gsap.fromTo(
        car,
        { x: () => window.innerWidth * 0.75 },
        {
          x: 0,
          ease: "power2.out",
          onUpdate: spin,
          scrollTrigger: { trigger: reveal, start: "top bottom", end: "bottom bottom", scrub: 0.6, invalidateOnRefresh: true },
        },
      );
    }, el);
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  return (
    <div ref={root} className="relative">
      {/* lit floor, contact shadow and a faint reflection */}
      <div className="absolute inset-x-[-18%] top-[62%] h-[70%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(239_237_232/0.1),rgb(239_237_232/0.03)_60%,transparent)]" />
      <div ref={body} data-car-body className="relative will-change-transform">
        <SideCar car={heroCar} sizes="(min-width: 1024px) 60rem, 96vw" />
        {/* mirrored about the ground line (the image has the same clear margin below the tyres) */}
        <div className="pointer-events-none absolute inset-x-0 top-[87.6%] -scale-y-100 opacity-[0.08] [mask-image:linear-gradient(to_top,black,transparent_32%)]" aria-hidden>
          <Image src={heroCar.side} alt="" sizes="(min-width: 1024px) 60rem, 96vw" className="h-auto w-full" />
        </div>
      </div>
    </div>
  );
}
