import { promises as fs } from "fs";
import path from "path";

export type Inquiry = {
  id: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  createdAt: string;
};

const FILE = path.join(process.cwd(), "data", "inquiries.json");
const MAX_STORED = 2000;

export async function getInquiries(): Promise<Inquiry[]> {
  try {
    const parsed = JSON.parse(await fs.readFile(FILE, "utf8"));
    return Array.isArray(parsed) ? (parsed as Inquiry[]) : [];
  } catch {
    return [];
  }
}

export async function addInquiry(entry: Omit<Inquiry, "id" | "createdAt">): Promise<Inquiry> {
  const all = await getInquiries();
  const item: Inquiry = {
    ...entry,
    id: `inq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  const next = [item, ...all].slice(0, MAX_STORED);
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  const tmp = `${FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(next, null, 2), "utf8");
  await fs.rename(tmp, FILE);
  return item;
}

export async function deleteInquiry(id: string): Promise<void> {
  const all = await getInquiries();
  const next = all.filter((i) => i.id !== id);
  await fs.writeFile(FILE, JSON.stringify(next, null, 2), "utf8");
}
