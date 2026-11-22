import { promises as fs } from "fs";
import path from "path";
import { DEFAULT_SITE, sanitizeSite, type SiteContent } from "./siteSchema";

export * from "./siteSchema";

/** Read/write data/site.json (server only). */
const FILE = path.join(process.cwd(), "data", "site.json");

export async function getSiteContent(): Promise<SiteContent> {
  try {
    const raw = await fs.readFile(FILE, "utf8");
    return sanitizeSite(JSON.parse(raw));
  } catch {
    return DEFAULT_SITE;
  }
}

export async function saveSiteContent(input: unknown): Promise<SiteContent> {
  const clean = sanitizeSite(input);
  if (clean.moodboard.headlines.length === 0) clean.moodboard.headlines = DEFAULT_SITE.moodboard.headlines;
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(clean, null, 2), "utf8");
  await fs.rename(tmp, FILE);
  return clean;
}
