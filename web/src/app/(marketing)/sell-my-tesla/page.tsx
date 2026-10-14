import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";
import { getLandingContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getLandingContent("tesla");
  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: { canonical: "/sell-my-tesla" },
    openGraph: { title: seo.title, description: seo.description, url: "/sell-my-tesla" },
  };
}

export default async function Page() {
  const content = await getLandingContent("tesla");
  return <LandingPage content={content} />;
}
