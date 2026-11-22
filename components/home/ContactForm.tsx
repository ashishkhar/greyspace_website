"use client";

import { FormEvent, useState } from "react";

export default function ContactForm({ button, success }: { button: string; success: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done">("idle");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(form.entries())),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not send");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send");
      setState("idle");
    }
  }

  if (state === "done") {
    return (
      <div className="flex min-h-[260px] items-center">
        <p className="text-2xl font-light leading-snug text-sand-300">{success}</p>
      </div>
    );
  }

  const field =
    "peer w-full border-0 border-b border-white/15 bg-transparent px-0 pb-3 pt-6 text-base text-white outline-none transition placeholder:text-transparent focus:border-sand-400";
  const label =
    "pointer-events-none absolute left-0 top-6 text-xs uppercase tracking-[0.22em] text-white/45 transition-all peer-focus:top-0 peer-focus:text-[10px] peer-focus:text-sand-400 peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[10px]";

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="relative">
        <input id="c-name" name="name" required maxLength={120} placeholder="Your name" className={field} autoComplete="name" />
        <label htmlFor="c-name" className={label}>Your name</label>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="relative">
          <input id="c-phone" name="phone" maxLength={40} placeholder="Your phone" className={field} autoComplete="tel" inputMode="tel" />
          <label htmlFor="c-phone" className={label}>Your phone</label>
        </div>
        <div className="relative">
          <input id="c-email" name="email" type="email" maxLength={160} placeholder="Your email" className={field} autoComplete="email" />
          <label htmlFor="c-email" className={label}>Your email</label>
        </div>
      </div>
      <div className="relative">
        <textarea id="c-msg" name="message" rows={3} maxLength={3000} placeholder="About your space" className={`${field} resize-none`} />
        <label htmlFor="c-msg" className={label}>About your space</label>
      </div>
      {/* bots fill this, people never see it */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      <div className="flex items-center justify-between gap-4 pt-2">
        <p className="min-h-[1.25rem] text-sm text-red-300/90">{error}</p>
        <button
          type="submit"
          disabled={state === "sending"}
          className="group inline-flex items-center gap-4 rounded-full border border-white/15 py-2 pl-6 pr-2 text-sm uppercase tracking-[0.2em] text-white transition hover:border-sand-400/60 disabled:opacity-50"
        >
          {state === "sending" ? "Sending" : button}
          <span className="grid h-10 w-10 place-items-center rounded-full bg-sand-400 text-ink-950 transition group-hover:translate-x-0.5">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </button>
      </div>
    </form>
  );
}
