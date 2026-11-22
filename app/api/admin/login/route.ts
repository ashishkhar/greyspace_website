import { NextResponse } from "next/server";
import {
  ADMIN_COOKIE,
  adminConfigured,
  checkCredentials,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    if (!adminConfigured()) {
      return NextResponse.json(
        { error: "Admin login is not configured on this server (set ADMIN_USERNAME and ADMIN_PASSWORD)." },
        { status: 503 },
      );
    }

    const body = (await req.json()) as { username?: string; password?: string };
    const username = String(body.username ?? "").slice(0, 200);
    const password = String(body.password ?? "").slice(0, 500);

    if (!checkCredentials(username, password)) {
      // Slow down guessing a little.
      await new Promise((r) => setTimeout(r, 400));
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(ADMIN_COOKIE, createSessionToken(), sessionCookieOptions);
    // Drop the legacy unsigned cookie.
    res.cookies.set("moodboard_admin_auth", "", { path: "/", maxAge: 0 });
    return res;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
