import type { Metadata } from "next";
import { Suspense } from "react";
import { QuoteWizard } from "@/components/quote/wizard";
import { site } from "@/lib/site";
import { isPlausibleReg, normaliseReg, type Category } from "@/lib/vehicles";

export const metadata: Metadata = {
  title: "Get your offer",
  description: `Tell us about your Tesla, electric car or van and get a firm offer from ${site.brand.fullName}.`,
  alternates: { canonical: "/quote" },
  robots: { index: false, follow: true },
};

type Search = Promise<{ reg?: string; category?: string }>;

async function WizardFromParams({ searchParams }: { searchParams: Search }) {
  const params = await searchParams;
  const reg = params.reg && isPlausibleReg(params.reg) ? normaliseReg(params.reg) : undefined;
  const category = (["tesla", "ev", "van"] as const).includes(params.category as Category) ? (params.category as Category) : undefined;
  return <QuoteWizard initialReg={reg} initialCategory={category} />;
}

export default function QuotePage({ searchParams }: { searchParams: Search }) {
  return (
    <div className="container-page pt-6 sm:pt-10">
      <Suspense fallback={<WizardSkeleton />}>
        <WizardFromParams searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

function WizardSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-8 xl:gap-12" aria-busy>
      <div className="h-40 rounded-[2rem] bg-night-900 ring-1 ring-chalk/[0.07] lg:h-[calc(100svh-7.5rem)]" />
      <div className="h-[34rem] rounded-[2rem] bg-pearl-50" />
    </div>
  );
}
