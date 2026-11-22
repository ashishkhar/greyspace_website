import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "./auth";

/** Defense in depth for route handlers (proxy.ts already gates these paths). */
export async function requireAdmin(): Promise<NextResponse | null> {
  const store = await cookies();
  if (verifySessionToken(store.get(ADMIN_COOKIE)?.value)) return null;
  return NextResponse.json({ error: "Not authorized" }, { status: 401 });
}
