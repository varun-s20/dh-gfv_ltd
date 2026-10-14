import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";
import { getLandingContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getLandingContent("van");
  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: { canonical: "/sell-my-electric-van" },
    openGraph: { title: seo.title, description: seo.description, url: "/sell-my-electric-van" },
  };
}

export default async function Page() {
  const content = await getLandingContent("van");
  return <LandingPage content={content} />;
}
