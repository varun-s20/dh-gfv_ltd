import Image from "next/image";
import Link from "next/link";
import { Chevron } from "@/components/ui/primitives";
import type { FleetVehicle } from "@/content/fleet";

export type ShowroomItem = {
  make: string;
  vehicle: FleetVehicle;
  models: number;
  href: "/sell-my-tesla" | "/sell-my-electric-car" | "/sell-my-electric-van";
};

/**
 * The makes we see most, as a lit showroom: each bay has the make, how many of
 * its models we buy, and one of its vehicles side-on under a floor light. All the
 * vehicles face the same way and roll forward a touch when you point at them.
 */
export function BrandShowroom({ items }: { items: ShowroomItem[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
      {items.map(({ make, vehicle, models, href }) => (
        <li key={make}>
          <Link
            href={href}
            className="group relative isolate flex h-full flex-col overflow-hidden rounded-[1.75rem] bg-[linear-gradient(180deg,var(--color-night-800),var(--color-night-900)_70%)] p-5 ring-1 ring-chalk/[0.07] transition-[box-shadow,background-color] duration-500 hover:ring-chalk/20 sm:p-6"
          >
            {/* the make, huge and faint, behind the vehicle */}
            <span
              aria-hidden
              className="backdrop-word backdrop-word-fill pointer-events-none absolute inset-x-0 top-[38%] -z-10 truncate px-4 text-center text-[clamp(3.4rem,2rem+4vw,5.6rem)] opacity-[0.16] transition-opacity duration-500 group-hover:opacity-25"
            >
              {make}
            </span>
            <span className="flex items-start justify-between gap-4">
              <span>
                <span className="block font-display text-[1.55rem] leading-none font-medium tracking-[-0.03em]">{make}</span>
                <span className="mt-2 block text-[0.85rem] text-chalk-3">
                  {models} model{models === 1 ? "" : "s"} we buy
                </span>
              </span>
              <span className="chip bg-chalk/10 text-chalk transition-colors duration-300 group-hover:bg-chalk group-hover:text-night-950">
                <Chevron />
              </span>
            </span>
            <span className="relative mt-8 block aspect-[2.7/1] w-full">
              <span aria-hidden className="absolute inset-x-[-6%] bottom-[-18%] h-[60%] rounded-[50%] bg-[radial-gradient(closest-side,rgb(239_237_232/0.12),transparent)]" />
              <span aria-hidden className="absolute inset-x-[10%] bottom-[1%] h-[8%] rounded-[50%] bg-black/70 blur-[8px]" />
              <Image
                src={vehicle.views[0]!.src}
                alt={vehicle.alt}
                fill
                sizes="(min-width: 1024px) 26rem, (min-width: 640px) 45vw, 90vw"
                quality={75}
                className="object-contain object-bottom transition-transform duration-700 ease-glide group-hover:-translate-x-2"
              />
            </span>
            <span className="label mt-4 block text-chalk-3">{vehicle.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
