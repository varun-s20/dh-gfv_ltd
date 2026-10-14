import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Cta, Logo } from "@/components/ui/primitives";
import { heroCar } from "@/content/cars";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

export default function NotFound() {
  return (
    <main className="relative isolate flex min-h-dvh flex-col overflow-hidden bg-night-950">
      <div className="spotlight absolute inset-0 -z-10" />
      <div className="container-page flex h-20 items-center">
        <Link href="/" aria-label="Green Future Vehicles home">
          <Logo />
        </Link>
      </div>
      <div className="relative flex flex-1 flex-col items-center justify-center px-4 pb-16 text-center">
        <p aria-hidden className="backdrop-word backdrop-word-fill text-[clamp(7rem,min(34vw,36svh),26rem)]">
          404
        </p>
        <div className="relative -mt-[min(12vw,12svh)] w-[min(70vw,46rem,88svh)] opacity-90">
          <Image src={heroCar.xray} alt="" sizes="70vw" className="h-auto w-full" />
        </div>
        <h1 className="display mt-8 text-d2">
          Wrong turn. <em>Easily fixed.</em>
        </h1>
        <p className="mt-4 max-w-md text-chalk-2">The link may be old or mistyped. Your offer is still only a registration away.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <Cta href="/quote" size="lg">
            Get my offer
          </Cta>
          <Cta href="/" variant="ghost" size="lg">
            Home
          </Cta>
        </div>
      </div>
    </main>
  );
}
