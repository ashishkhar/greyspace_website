"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError("Enter username and password.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username: username.trim(), password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Login failed");
        return;
      }

      const next =
        (typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null) || "/admin";
      window.location.assign(next);
    } catch {
      setError("Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4">
      <section className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-5">
        <h1 className="mb-3 text-2xl font-semibold text-gold-400">Admin Login</h1>
        <form onSubmit={onSubmit} className="space-y-3">
          <input
            className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <input
            type="password"
            className="w-full rounded-md border border-zinc-800 bg-black px-3 py-2"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-gold-500 px-4 py-2 font-medium text-black hover:bg-gold-400 disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
      </section>
    </main>
  );
}

