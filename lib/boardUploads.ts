import { promises as fs } from "fs";
import path from "path";
import type { BoardImage } from "./types";

const UPLOADS_ROOT = path.join(process.cwd(), "public", "uploads");

/** Safe single path segment for /public/uploads/{segment}/file */
export function sanitizeBoardFolderSegment(raw: string): string {
  const s = raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (s || "BOARD").slice(0, 64);
}

/** Parse /uploads/{optionalSegment}/filename or legacy /uploads/filename */
export function parseUploadPath(
  url: string,
): { segment: string | null; filename: string } | null {
  if (!url.startsWith("/uploads/")) return null;
  const rest = url.slice("/uploads/".length);
  const parts = rest.split("/").filter(Boolean);
  if (parts.length === 1) {
    return { segment: null, filename: parts[0] };
  }
  const filename = parts[parts.length - 1];
  const segment = parts.slice(0, -1).join("/");
  return { segment: segment || null, filename };
}

/**
 * Ensure image lives under public/uploads/{targetSegment}/filename.
 * - Already there: no-op.
 * - Nested/other segment: rename (move) when source is in a subfolder; avoids breaking other boards for flat /uploads/x.jpg by copying.
 */
export async function moveImageToBoardFolder(
  img: BoardImage,
  targetSegment: string,
): Promise<BoardImage> {
  const parsed = parseUploadPath(img.url);
  if (!parsed) return img;

  const target = sanitizeBoardFolderSegment(targetSegment);
  const { segment, filename } = parsed;

  if (segment === target) return img;

  const destDir = path.join(UPLOADS_ROOT, target);
  await fs.mkdir(destDir, { recursive: true });
  const destPath = path.join(destDir, filename);

  let sourcePath: string;
  if (segment) {
    sourcePath = path.join(UPLOADS_ROOT, segment, filename);
  } else {
    sourcePath = path.join(UPLOADS_ROOT, filename);
  }

  try {
    await fs.access(sourcePath);
  } catch {
    return { ...img, url: `/uploads/${target}/${filename}` };
  }

  if (sourcePath !== destPath) {
    const inSubfolder = Boolean(segment);
    if (inSubfolder) {
      try {
        await fs.rename(sourcePath, destPath);
      } catch {
        await fs.copyFile(sourcePath, destPath);
        await fs.unlink(sourcePath);
      }
      if (segment && segment !== target) {
        try {
          const oldDir = path.join(UPLOADS_ROOT, segment);
          const left = await fs.readdir(oldDir);
          if (left.length === 0) await fs.rmdir(oldDir);
        } catch {
          /* ignore */
        }
      }
    } else {
      await fs.copyFile(sourcePath, destPath);
    }
  }

  return { ...img, url: `/uploads/${target}/${filename}` };
}

export async function normalizeImagesToBoardFolder(
  images: BoardImage[],
  targetSegment: string,
): Promise<BoardImage[]> {
  const out: BoardImage[] = [];
  for (const img of images) {
    out.push(await moveImageToBoardFolder(img, targetSegment));
  }
  return out;
}
