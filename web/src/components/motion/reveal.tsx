"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";

/**
 * Lifts its children into place as they scroll into view, one after another.
 * Only content below the fold is ever hidden, so nothing flashes on load.
 */
export function Reveal({ children, className, stagger = 0.08, as: Tag = "div" }: { children: React.ReactNode; className?: string; stagger?: number; as?: "div" | "ul" | "ol" }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    const ctx = gsap.context(() => {
      gsap.from(Array.from(el.children), {
        y: 36,
        autoAlpha: 0,
        duration: 0.9,
        ease: "power3.out",
        stagger,
        scrollTrigger: { trigger: el, start: "top 86%", once: true },
      });
    }, el);
    return () => ctx.revert();
  }, [stagger]);
  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}
