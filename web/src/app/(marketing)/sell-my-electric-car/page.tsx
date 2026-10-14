import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";
import { getLandingContent } from "@/lib/content";

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getLandingContent("ev");
  return {
    title: { absolute: seo.title },
    description: seo.description,
    alternates: { canonical: "/sell-my-electric-car" },
    openGraph: { title: seo.title, description: seo.description, url: "/sell-my-electric-car" },
  };
}

export default async function Page() {
  const content = await getLandingContent("ev");
  return <LandingPage content={content} />;
}
