import SiteEditor from "@/components/admin/SiteEditor";
import { getSiteContent } from "@/lib/siteContent";

export const dynamic = "force-dynamic";

export default async function SiteEditorPage() {
  const content = await getSiteContent();
  return <SiteEditor initial={content} />;
}
