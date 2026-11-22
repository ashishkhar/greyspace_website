import { promises as fs } from "fs";
import path from "path";
import { sanitizeBoardFolderSegment } from "./boardUploads";

/**
 * Image storage. Today: local disk under public/uploads, served by app/uploads/[...slug].
 * Later (S3): add an "s3" branch in storeImage() that PUTs the bytes to the bucket and
 * returns the public/CDN URL. Every caller already stores just the returned URL, so
 * boards and site content keep working with mixed local + S3 URLs.
 */

export const MAX_UPLOAD_BYTES = 30 * 1024 * 1024;

const TYPES: Record<string, { ext: string; magic: (b: Uint8Array) => boolean }> = {
  "image/jpeg": { ext: ".jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { ext: ".png", magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  "image/gif": { ext: ".gif", magic: (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 },
  "image/webp": {
    ext: ".webp",
    magic: (b) => ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 12) === "WEBP",
  },
  "image/avif": { ext: ".avif", magic: (b) => ascii(b, 4, 8) === "ftyp" && /avi[fs]/.test(ascii(b, 8, 12)) },
};

function ascii(b: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...Array.from(b.slice(start, end)));
}

/** Identify the image type from its bytes (never trust the client's MIME or name). */
export function sniffImageType(bytes: Uint8Array): string | null {
  for (const [mime, t] of Object.entries(TYPES)) {
    if (t.magic(bytes)) return mime;
  }
  return null;
}

export type StoredImage = { url: string; bytes: number; contentType: string };

export async function storeImage(opts: {
  folder: string;
  originalName: string;
  bytes: Uint8Array;
}): Promise<StoredImage> {
  const contentType = sniffImageType(opts.bytes);
  if (!contentType) throw new UploadError("Only JPG, PNG, WebP, GIF or AVIF images are allowed.");
  if (opts.bytes.byteLength > MAX_UPLOAD_BYTES) throw new UploadError("Image is larger than 30 MB.");

  const segment = sanitizeBoardFolderSegment(opts.folder || "GENERAL");
  const ext = TYPES[contentType].ext;
  const base =
    path
      .basename(opts.originalName || "image", path.extname(opts.originalName || ""))
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 80) || "image";
  const filename = `${Date.now()}-${base}${ext}`;

  const driver = (process.env.STORAGE_DRIVER || "local").toLowerCase();
  if (driver !== "local") {
    throw new UploadError(`Storage driver "${driver}" is not set up yet.`);
  }

  const dir = path.join(process.cwd(), "public", "uploads", segment);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), opts.bytes);
  return { url: `/uploads/${segment}/${filename}`, bytes: opts.bytes.byteLength, contentType };
}

export class UploadError extends Error {}
