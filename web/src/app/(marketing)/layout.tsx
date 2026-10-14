import { ConsentManager } from "@/components/site/consent";
import { SiteFooter } from "@/components/site/footer";
import { SiteNav } from "@/components/site/nav";
import { QuickDock } from "@/components/site/quick-dock";
import { SmoothScroll } from "@/components/site/smooth-scroll";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SmoothScroll />
      <SiteNav />
      <main id="main" tabIndex={-1} className="relative outline-none">
        {children}
      </main>
      <SiteFooter />
      <QuickDock />
      <ConsentManager />
    </>
  );
}
