import { NextResponse } from "next/server";
import { addInquiry } from "@/lib/inquiries";

// Small in-memory limiter: 5 inquiries per IP per 10 minutes.
const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 5;
const hits = new Map<string, number[]>();

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > LIMIT;
}

function clean(v: unknown, max: number) {
  return typeof v === "string" ? v.replace(/[\u0000-\u0008\u000b-\u001f]/g, "").trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
  if (limited(ip)) {
    return NextResponse.json({ error: "Too many requests — please try again later." }, { status: 429 });
  }
  try {
    const body = (await req.json()) as Record<string, unknown>;
    // Honeypot field: real visitors never fill it.
    if (clean(body.website, 200)) return NextResponse.json({ ok: true });

    const name = clean(body.name, 120);
    const phone = clean(body.phone, 40);
    const email = clean(body.email, 160);
    const message = clean(body.message, 3000);

    if (!name) return NextResponse.json({ error: "Please add your name." }, { status: 400 });
    if (!phone && !email) {
      return NextResponse.json({ error: "Please add a phone number or email." }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "That email does not look right." }, { status: 400 });
    }

    await addInquiry({ name, phone, email, message });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Could not send — please try again." }, { status: 500 });
  }
}
