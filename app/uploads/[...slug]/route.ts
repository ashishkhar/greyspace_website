import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";

// SVG is deliberately not served as an image: it can carry script.
const MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".avif": "image/avif",
};

export const runtime = "nodejs";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

export async function GET(_: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  try {
    const { slug } = await params;
    if (!slug || slug.length === 0) {
      return NextResponse.json({ error: "File path missing" }, { status: 400 });
    }

    const filePath = path.resolve(UPLOADS_ROOT, ...slug);
    if (!filePath.startsWith(UPLOADS_ROOT + path.sep)) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext];
    if (!type) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const file = await fs.readFile(filePath);
    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
