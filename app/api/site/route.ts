import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { getSiteContent, saveSiteContent } from "@/lib/siteContent";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ content: await getSiteContent() });
}

export async function PUT(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = (await req.json()) as { content?: unknown };
    const content = await saveSiteContent(body.content);
    revalidatePath("/");
    revalidatePath("/moodboard");
    return NextResponse.json({ content });
  } catch {
    return NextResponse.json({ error: "Could not save content" }, { status: 500 });
  }
}
