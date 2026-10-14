"use client";

import { clsx } from "clsx";
import { FileText } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PhoneIcon, WhatsAppIcon } from "@/components/ui/primitives";
import { site, whatsappLink } from "@/lib/site";

/**
 * Range Rover's floating action rail on desktop (icons that open into labels)
 * and a slim action bar on phones. Both wait until the hero has scrolled away.
 */
export function QuickDock() {
  const pathname = usePathname();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let frame = 0;
    const read = () => {
      frame = 0;
      const nearEnd = window.innerHeight + window.scrollY > document.documentElement.scrollHeight - window.innerHeight * 0.9;
      setShown(window.scrollY > window.innerHeight * 0.7 && !nearEnd);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [pathname]);

  const category = pathname.includes("tesla") ? "tesla" : pathname.includes("van") ? "van" : pathname.includes("electric-car") ? "ev" : undefined;
  const quoteHref = category ? `/quote?category=${category}` : "/quote";
  const waText = "Hi, I'd like an offer for my vehicle.";

  return (
    <>
      <div
        className={clsx(
          "fixed top-1/2 right-0 z-50 hidden -translate-y-1/2 flex-col items-end gap-1 transition-[opacity,translate] duration-500 ease-glide lg:flex",
          shown ? "opacity-100" : "pointer-events-none translate-x-6 opacity-0",
        )}
        aria-label="Quick actions"
        role="navigation"
      >
        <DockLink href={quoteHref} label="Get my offer" icon={<FileText className="size-4" strokeWidth={1.6} />} primary />
        <DockLink href={whatsappLink(waText)} label="WhatsApp us" icon={<WhatsAppIcon />} external location="dock" />
        <DockLink href={`tel:${site.contact.phoneE164}`} label={site.contact.phoneDisplay} icon={<PhoneIcon />} external location="dock" />
      </div>

      <div
        className={clsx(
          "fixed inset-x-3 bottom-3 z-50 grid grid-cols-[1fr_auto_auto] gap-2 rounded-2xl bg-night-800/85 p-2 shadow-[0_0_0_1px_rgb(239_237_232/0.08),0_1rem_2.5rem_-0.5rem_rgb(0_0_0/0.6)] backdrop-blur-xl transition-[opacity,translate] duration-500 ease-glide lg:hidden",
          shown ? "opacity-100" : "pointer-events-none translate-y-[130%] opacity-0",
        )}
        aria-label="Quick actions"
        role="navigation"
      >
        <Link href={quoteHref as "/quote"} className="label flex h-12 items-center justify-center rounded-xl bg-chalk text-night-950 transition-transform active:scale-[0.97]">
          Get my offer
        </Link>
        <a href={whatsappLink(waText)} target="_blank" rel="noopener" data-location="mobile-bar" aria-label="WhatsApp us" className="flex h-12 w-12 items-center justify-center rounded-xl bg-night-700 text-chalk transition-transform active:scale-[0.95]">
          <WhatsAppIcon className="size-5" />
        </a>
        <a href={`tel:${site.contact.phoneE164}`} data-location="mobile-bar" aria-label={`Call ${site.contact.phoneDisplay}`} className="flex h-12 w-12 items-center justify-center rounded-xl bg-night-700 text-chalk transition-transform active:scale-[0.95]">
          <PhoneIcon className="size-[1.1rem]" />
        </a>
      </div>
    </>
  );
}

function DockLink({ href, label, icon, primary, external, location }: { href: string; label: string; icon: React.ReactNode; primary?: boolean; external?: boolean; location?: string }) {
  const className = clsx(
    "dock-item label shadow-[0_0.75rem_2rem_-0.5rem_rgb(0_0_0/0.55)]",
    primary ? "bg-chalk text-night-950" : "bg-night-800/90 text-chalk ring-1 ring-chalk/10 backdrop-blur-xl hover:bg-night-700",
  );
  const body = (
    <>
      <span className="flex h-[2.9rem] w-[2.9rem] flex-none items-center justify-center">{icon}</span>
      <span className="pr-4">{label}</span>
    </>
  );
  const style = { "--open-w": `${Math.max(9.5, label.length * 0.62 + 4.5)}rem` } as React.CSSProperties;
  return external ? (
    <a href={href} className={className} style={style} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener" data-location={location}>
      {body}
    </a>
  ) : (
    <Link href={href as "/quote"} className={className} style={style}>
      {body}
    </Link>
  );
}
