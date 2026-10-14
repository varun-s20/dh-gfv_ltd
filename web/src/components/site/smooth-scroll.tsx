"use client";

import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { ScrollTrigger, gsap, prefersReducedMotion, setLenis } from "@/lib/motion";

/**
 * Weighted, inertial scrolling (as on zoox.com) driven from GSAP's ticker so
 * every scroll-linked animation reads the same frame. Skipped entirely when the
 * visitor prefers reduced motion; native scrolling still works everywhere.
 */
export function SmoothScroll() {
  const pathname = usePathname();

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      anchors: { offset: -96 },
      // Touch keeps the platform's own momentum.
      syncTouch: false,
    });
    setLenis(lenis);
    lenis.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      setLenis(null);
    };
  }, []);

  // A new page starts at the top, without gliding there.
  useEffect(() => {
    if (window.location.hash) return;
    window.scrollTo(0, 0);
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, [pathname]);

  return null;
}
