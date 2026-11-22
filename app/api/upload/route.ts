import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { MAX_UPLOAD_BYTES, storeImage, UploadError } from "@/lib/storage";

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    const folder = String(formData.get("folder") ?? "").trim() || "GENERAL";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return NextResponse.json({ error: "Image is larger than 30 MB." }, { status: 413 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const stored = await storeImage({ folder, originalName: file.name, bytes });
    return NextResponse.json({ url: stored.url });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
