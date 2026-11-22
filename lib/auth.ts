import crypto from "crypto";

/**
 * Admin session: an HMAC-signed, expiring token in an httpOnly cookie.
 * Credentials come from ADMIN_USERNAME / ADMIN_PASSWORD in .env.local (never in source).
 * ADMIN_SESSION_SECRET signs the cookie; if unset it is derived from the credentials,
 * so changing the password also logs every session out.
 */
export const ADMIN_COOKIE = "gs_admin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

function credentials() {
  return {
    username: process.env.ADMIN_USERNAME?.trim() || "",
    password: process.env.ADMIN_PASSWORD || "",
  };
}

function secret(): string {
  const explicit = process.env.ADMIN_SESSION_SECRET;
  if (explicit && explicit.length >= 16) return explicit;
  const { username, password } = credentials();
  return crypto.createHash("sha256").update(`greyspaces:${username}:${password}`).digest("hex");
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ha = new Uint8Array(crypto.createHash("sha256").update(a).digest());
  const hb = new Uint8Array(crypto.createHash("sha256").update(b).digest());
  return crypto.timingSafeEqual(ha, hb);
}

export function adminConfigured(): boolean {
  const { username, password } = credentials();
  return Boolean(username && password);
}

export function checkCredentials(username: string, password: string): boolean {
  if (!adminConfigured()) return false;
  const expected = credentials();
  // Evaluate both comparisons so timing does not reveal which one failed.
  const userOk = safeEqual(username.trim(), expected.username);
  const passOk = safeEqual(password, expected.password);
  return userOk && passOk;
}

export function createSessionToken(): string {
  const expires = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = `v1.${expires}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined | null): boolean {
  if (!token || !adminConfigured()) return false;
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const expires = Number(parts[1]);
  if (!Number.isFinite(expires) || expires < Date.now()) return false;
  return safeEqual(parts[2], sign(`${parts[0]}.${parts[1]}`));
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE_SECONDS,
};
