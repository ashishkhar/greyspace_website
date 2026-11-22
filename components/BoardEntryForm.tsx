"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Variant = "default" | "landing";

export default function BoardEntryForm({ variant = "default" }: { variant?: Variant }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isLanding = variant === "landing";

  async function onOpen() {
    if (!code.trim()) {
      setError("Please enter your code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const normalized = code.trim().toUpperCase();
      const res = await fetch(`/api/board/${encodeURIComponent(normalized)}`);
      if (!res.ok) {
        setError("That code doesn’t match an active presentation. Double-check with your designer.");
        return;
      }
      router.push(`/board/${normalized}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      className={
        isLanding
          ? "w-full max-w-lg rounded-sm border border-zinc-800/50 bg-charcoal-900/40 px-8 py-10 shadow-[0_0_0_1px_rgba(212,175,55,0.06)] backdrop-blur-sm"
          : "w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950 p-5"
      }
    >
      {!isLanding ? (
        <h2 className="mb-3 text-2xl font-semibold text-gold-400">Open your board</h2>
      ) : null}
      <label htmlFor="board-code-input" className="sr-only">
        Board code
      </label>
      <input
        id="board-code-input"
        className={
          isLanding
            ? "w-full rounded-sm border border-zinc-700/60 bg-charcoal-950 px-4 py-3.5 text-zinc-100 placeholder:text-zinc-600 focus:border-gold-500/40 focus:outline-none focus:ring-1 focus:ring-gold-500/30"
            : "w-full rounded-md border border-zinc-800 bg-black px-3 py-2"
        }
        placeholder="Your private code"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === "Enter" && void onOpen()}
        autoComplete="off"
      />
      <button
        type="button"
        onClick={() => void onOpen()}
        disabled={loading}
        className={
          isLanding
            ? "mt-4 w-full rounded-sm bg-gold-500 px-4 py-3.5 text-sm font-medium uppercase tracking-[0.2em] text-black transition hover:bg-gold-400 disabled:opacity-50"
            : "mt-3 w-full rounded-md bg-gold-500 px-4 py-2 font-medium text-black hover:bg-gold-400 disabled:opacity-50"
        }
      >
        {loading ? "One moment…" : isLanding ? "Enter" : "Open"}
      </button>
      {error ? (
        <p className={`mt-3 text-sm ${isLanding ? "text-zinc-500" : "text-red-400"}`}>{error}</p>
      ) : null}
    </section>
  );
}
