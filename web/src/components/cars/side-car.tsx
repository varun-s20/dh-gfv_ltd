import { clsx } from "clsx";
import Image from "next/image";
import type { SideProfile } from "@/content/cars";
import { gsap } from "@/lib/motion";

/**
 * A side-on car with its two rims as separate layers (tagged data-s="rim") so
 * they can roll with the car. Sized entirely by its parent's width.
 */
export function SideCar({
  car,
  sizes,
  priority,
  className,
  shadow = true,
  children,
}: {
  car: SideProfile;
  sizes: string;
  priority?: boolean;
  className?: string;
  shadow?: boolean;
  children?: React.ReactNode;
}) {
  const ratio = car.side.height / car.side.width;
  return (
    <div className={clsx("relative", className)} style={{ aspectRatio: `${car.side.width} / ${car.side.height}` }}>
      {shadow ? (
        <>
          <div aria-hidden className="absolute inset-x-[5%] bottom-[-3%] h-[11%] rounded-[50%] bg-black/85 blur-[16px]" />
          <div aria-hidden className="absolute inset-x-[13%] bottom-[-1%] h-[4%] rounded-[50%] bg-black blur-[5px]" />
        </>
      ) : null}
      <Image
        src={car.side}
        alt={car.alt}
        sizes={sizes}
        quality={85}
        {...(priority ? { loading: "eager" as const, fetchPriority: "high" as const } : {})}
        className="relative h-auto w-full select-none"
        draggable={false}
      />
      {(["front", "rear"] as const).map((k) => {
        const r = car.rims[k];
        return (
          <div
            key={k}
            className="absolute"
            style={{ left: `${r.cx - r.d / 2}%`, top: `${r.cy - r.d / 2 / ratio}%`, width: `${r.d}%`, aspectRatio: "1", transform: r.sx ? `scaleX(${r.sx})` : undefined }}
          >
            {r.under ? <Image src={r.under} alt="" sizes="12vw" quality={85} className="absolute inset-0 h-full w-full" draggable={false} /> : null}
            <Image data-s="rim" src={r.src} alt="" sizes="12vw" quality={85} className="relative h-full w-full will-change-transform" draggable={false} />
          </div>
        );
      })}
      {children}
    </div>
  );
}

/**
 * Rolls a car's rims to match how far it has travelled: angle = distance / radius.
 * Call the returned function on every frame the car might have moved.
 */
export function wheelSpinner(root: HTMLElement, car: SideProfile, position: () => number, scale: () => number = () => 1) {
  const rims = Array.from(root.querySelectorAll<HTMLElement>('[data-s="rim"]'));
  const sets = rims.map((r) => gsap.quickSetter(r, "rotation", "deg"));
  const body = root.querySelector<HTMLElement>("[data-car-body]") ?? root;
  let last: number | null = null;
  let angle = 0;
  return () => {
    const x = position();
    if (last === null) last = x;
    const radius = (body.offsetWidth * (car.rims.front.d / 100) * scale()) / 2;
    if (radius > 0) angle += ((x - last) / radius) * (180 / Math.PI);
    last = x;
    sets.forEach((set) => set(angle));
  };
}
