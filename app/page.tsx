import type { Metadata } from "next";
import HomeExperience from "@/components/home/HomeExperience";
import { getSiteContent } from "@/lib/siteContent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const c = await getSiteContent();
  return {
    title: c.seo.title,
    description: c.seo.description,
    openGraph: { title: c.seo.title, description: c.seo.description, type: "website" },
  };
}

export default async function HomePage() {
  const content = await getSiteContent();
  return <HomeExperience content={content} />;
}
