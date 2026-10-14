"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useRef } from "react";
import { ScrollTrigger, gsap, prefersReducedMotion } from "@/lib/motion";

/**
 * zoox.com's opening move: a rounded picture sitting inside the page grows to
 * fill the screen as you scroll, and the words arrive once it's full bleed.
 */
export function ExpandingMedia({
  image,
  alt,
  heading,
  sub,
  stats,
}: {
  image: StaticImageData;
  alt: string;
  heading: React.ReactNode;
  sub: string;
  stats: Array<{ value: string; label: string }>;
}) {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const q = gsap.utils.selector(el);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.8 },
      });
      tl.fromTo(q("[data-frame]"), { clipPath: "inset(16% 20% 16% 20% round 2rem)" }, { clipPath: "inset(0% 0% 0% 0% round 0rem)", duration: 1, ease: "power2.inOut" }, 0)
        .fromTo(q("[data-img]"), { scale: 1.18 }, { scale: 1, duration: 1.2, ease: "power2.out" }, 0)
        .fromTo(q("[data-shade]"), { opacity: 0 }, { opacity: 1, duration: 0.5 }, 0.55)
        .fromTo(q("[data-copy] > *"), { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.45, stagger: 0.08, ease: "power2.out" }, 0.75)
        .fromTo(q("[data-stat]"), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.06, ease: "power2.out" }, 1.05)
        .set({}, {}, 1.8);
    }, el);
    ScrollTrigger.refresh();
    return () => ctx.revert();
  }, []);

  return (
    <section ref={root} className="relative isolate h-[260svh] bg-night-950 motion-reduce:h-auto" data-nav-theme="night">
      <div className="sticky top-0 h-svh overflow-hidden motion-reduce:relative">
        <div data-frame className="absolute inset-0 overflow-hidden">
          <Image data-img src={image} alt={alt} fill sizes="100vw" className="object-cover" />
          <div data-shade className="absolute inset-0 bg-[linear-gradient(180deg,rgb(5_6_7/0.88),rgb(5_6_7/0.55)_32%,rgb(5_6_7/0.3)_55%,rgb(5_6_7/0.94)),linear-gradient(90deg,rgb(5_6_7/0.6),transparent_60%)] max-sm:bg-[linear-gradient(180deg,rgb(5_6_7/0.9),rgb(5_6_7/0.72)_40%,rgb(5_6_7/0.55)_60%,rgb(5_6_7/0.95))]" />
        </div>
        <div className="relative flex h-full flex-col justify-between pt-28 pb-[6rem] sm:pb-14">
          <div data-copy className="container-page">
            <h2 className="display max-w-[15ch] text-d1 [&_em]:text-chalk-2">{heading}</h2>
            <p className="mt-5 max-w-md text-lead text-chalk-2">{sub}</p>
          </div>
          <div className="container-page">
            <dl className="grid grid-cols-2 gap-y-6 border-t hairline pt-6 lg:grid-cols-4">
              {stats.map((s) => (
                <div key={s.label} data-stat className="pr-4 lg:border-r lg:hairline lg:last:border-r-0 lg:[&:not(:first-child)]:pl-6">
                  <dt className="sr-only">{s.label}</dt>
                  <dd>
                    <span className="block font-display text-[clamp(1.6rem,1.2rem+1.6vw,2.6rem)] leading-none font-medium tracking-[-0.03em]">{s.value}</span>
                    <span className="mt-2 block text-[0.88rem] text-chalk-2">{s.label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </section>
  );
}
