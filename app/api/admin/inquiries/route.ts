import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { deleteInquiry } from "@/lib/inquiries";

export async function DELETE(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await deleteInquiry(id);
  return NextResponse.json({ ok: true });
}
