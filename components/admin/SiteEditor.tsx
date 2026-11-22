"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ICONS, type IconName, type SiteContent } from "@/lib/siteSchema";
import { Icon } from "@/components/home/Icons";

type Path = (string | number)[];

function setIn<T>(obj: T, path: Path, value: unknown): T {
  const copy = structuredClone(obj) as Record<string | number, unknown>;
  let cur = copy as Record<string | number, unknown>;
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]] as Record<string | number, unknown>;
  cur[path[path.length - 1]] = value;
  return copy as T;
}

/** Shrink big photos in the browser before upload: max 2400 px, WebP. Saves server disk. */
async function prepareImage(file: File): Promise<File> {
  if (file.type === "image/gif" || !file.type.startsWith("image/")) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.86));
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
    return file;
  }
}

async function uploadImage(file: File): Promise<string> {
  const prepared = await prepareImage(file);
  const fd = new FormData();
  fd.append("file", prepared);
  fd.append("folder", "SITE");
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Upload failed");
  return data.url as string;
}

// ---------------------------------------------------------------- fields

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-2.5 text-[14px] text-white outline-none transition placeholder:text-white/25 focus:border-sand-400/70 focus:bg-white/[0.05]";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-baseline justify-between text-[12px] font-medium text-white/60">
        {label}
        {hint ? <span className="font-normal text-white/30">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function Text({ label, value, onChange, hint, placeholder }: { label: string; value: string; onChange: (v: string) => void; hint?: string; placeholder?: string }) {
  return (
    <Field label={label} hint={hint}>
      <input className={inputCls} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function Area({ label, value, onChange, rows = 3, hint }: { label: string; value: string; onChange: (v: string) => void; rows?: number; hint?: string }) {
  return (
    <Field label={label} hint={hint}>
      <textarea className={`${inputCls} resize-y leading-relaxed`} rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    </Field>
  );
}

function ImageField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const input = useRef<HTMLInputElement>(null);
  return (
    <Field label={label}>
      <div className="flex gap-4">
        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="absolute inset-0 grid place-items-center text-[11px] text-white/30">No image</span>
          )}
          {busy ? <span className="absolute inset-0 grid place-items-center bg-black/60 text-xs">Uploading…</span> : null}
        </div>
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => input.current?.click()}
              className="rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-ink-950 hover:bg-sand-300"
            >
              {value ? "Replace" : "Upload"}
            </button>
            {value ? (
              <button type="button" onClick={() => onChange("")} className="rounded-full border border-white/15 px-4 py-1.5 text-[13px] text-white/70 hover:text-white">
                Remove
              </button>
            ) : null}
          </div>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setBusy(true);
              setErr("");
              try {
                onChange(await uploadImage(f));
              } catch (x) {
                setErr(x instanceof Error ? x.message : "Upload failed");
              } finally {
                setBusy(false);
              }
            }}
          />
          {err ? <p className="text-xs text-red-300">{err}</p> : <p className="truncate text-[11px] text-white/30">{value || "JPG, PNG, WebP — resized automatically"}</p>}
        </div>
      </div>
    </Field>
  );
}

function ListEditor<T>({
  items,
  onChange,
  make,
  render,
  itemLabel,
  max = 24,
  fixed = false,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  make: () => T;
  render: (item: T, set: (patch: Partial<T>) => void, index: number) => React.ReactNode;
  itemLabel: (item: T, i: number) => string;
  max?: number;
  fixed?: boolean;
}) {
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <details key={i} className="group rounded-2xl border border-white/[0.08] bg-white/[0.015] open:bg-white/[0.03]" open={items.length <= 2}>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-3.5">
            <span className="flex min-w-0 items-center gap-3">
              <span className="text-xs tabular-nums text-white/30">{String(i + 1).padStart(2, "0")}</span>
              <span className="truncate text-[14px] text-white/85">{itemLabel(item, i) || "Untitled"}</span>
            </span>
            {!fixed ? (
              <span className="flex shrink-0 items-center gap-1 text-white/40" onClick={(e) => e.preventDefault()}>
                <button type="button" aria-label="Move up" onClick={() => move(i, -1)} className="rounded-md px-2 py-1 hover:bg-white/10 hover:text-white">↑</button>
                <button type="button" aria-label="Move down" onClick={() => move(i, 1)} className="rounded-md px-2 py-1 hover:bg-white/10 hover:text-white">↓</button>
                <button
                  type="button"
                  aria-label="Remove"
                  onClick={() => {
                    if (window.confirm("Remove this item?")) onChange(items.filter((_, k) => k !== i));
                  }}
                  className="rounded-md px-2 py-1 hover:bg-red-500/20 hover:text-red-200"
                >
                  ✕
                </button>
              </span>
            ) : null}
          </summary>
          <div className="space-y-4 border-t border-white/[0.06] px-5 py-5">
            {render(item, (patch) => onChange(items.map((it, k) => (k === i ? { ...it, ...patch } : it))), i)}
          </div>
        </details>
      ))}
      {!fixed && items.length < max ? (
        <button
          type="button"
          onClick={() => onChange([...items, make()])}
          className="w-full rounded-2xl border border-dashed border-white/15 py-3 text-[13px] text-white/50 transition hover:border-sand-400/60 hover:text-sand-300"
        >
          + Add
        </button>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- editor

const SECTIONS = [
  { id: "brand", label: "Brand & contact" },
  { id: "hero", label: "Hero" },
  { id: "chapters", label: "3D chapters" },
  { id: "finale", label: "Closing quote" },
  { id: "studio", label: "Studio" },
  { id: "services", label: "Services" },
  { id: "stats", label: "Numbers" },
  { id: "projects", label: "Projects" },
  { id: "process", label: "Process" },
  { id: "testimonials", label: "Testimonials" },
  { id: "contact", label: "Contact form" },
  { id: "moodboard", label: "Moodboard page" },
  { id: "seo", label: "Search & sharing" },
] as const;

function Panel({ id, title, desc, children }: { id: string; title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-6 sm:p-8">
      <h2 className="text-xl font-light tracking-tight text-white">{title}</h2>
      {desc ? <p className="mt-1 text-sm text-white/45">{desc}</p> : null}
      <div className="mt-6 space-y-5">{children}</div>
    </section>
  );
}

export default function SiteEditor({ initial }: { initial: SiteContent }) {
  const [saved, setSaved] = useState(initial);
  const [c, setC] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState("");
  const [active, setActive] = useState<string>("brand");

  const dirty = useMemo(() => JSON.stringify(c) !== JSON.stringify(saved), [c, saved]);
  const set = (path: Path) => (v: unknown) => setC((prev) => setIn(prev, path, v));

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(s.id)).filter(Boolean) as HTMLElement[];
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis[0]) setActive(vis[0].target.id);
      },
      { rootMargin: "-20% 0px -60% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  async function save() {
    setStatus("saving");
    setError("");
    try {
      const res = await fetch("/api/site", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: c }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error("Your session expired — sign in again in a new tab, then save.");
      if (!res.ok) throw new Error(data.error || "Save failed");
      setSaved(data.content);
      setC(data.content);
      setStatus("saved");
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen bg-ink-950 text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-950/75 backdrop-blur-2xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-4">
            <Link href="/admin" className="text-sm text-white/45 hover:text-white">
              ← Admin
            </Link>
            <span className="hidden truncate text-[15px] font-medium sm:inline">Homepage content</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-white/40 sm:inline">
              {status === "saving" ? "Saving…" : status === "saved" ? "Saved — live on the site" : dirty ? "Unsaved changes" : "All changes saved"}
            </span>
            <Link href="/" target="_blank" className="rounded-full border border-white/15 px-4 py-2 text-[13px] text-white/75 hover:text-white">
              Preview ↗
            </Link>
            <button
              onClick={save}
              disabled={!dirty || status === "saving"}
              className="rounded-full bg-white px-5 py-2 text-[13px] font-medium text-ink-950 transition hover:bg-sand-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === "saving" ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
        {error ? <p className="bg-red-500/15 px-5 py-2 text-center text-sm text-red-200">{error}</p> : null}
      </header>

      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[200px_1fr]">
        <nav className="hidden lg:block">
          <ul className="sticky top-24 space-y-0.5">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className={`block rounded-lg px-3 py-2 text-[13px] transition ${active === s.id ? "bg-white/[0.07] text-white" : "text-white/45 hover:text-white"}`}
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-6">
          <Panel id="brand" title="Brand & contact" desc="Shown in the navigation, footer and contact links.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Text label="Studio name" value={c.brand.name} onChange={set(["brand", "name"])} />
              <Text label="Tagline" value={c.brand.tagline} onChange={set(["brand", "tagline"])} />
              <Text label="Email" value={c.brand.email} onChange={set(["brand", "email"])} />
              <Text label="Phone" value={c.brand.phone} onChange={set(["brand", "phone"])} />
              <Text label="Instagram URL" value={c.brand.instagram} onChange={set(["brand", "instagram"])} placeholder="https://instagram.com/…" />
              <Text label="LinkedIn URL" value={c.brand.linkedin} onChange={set(["brand", "linkedin"])} placeholder="https://linkedin.com/…" />
            </div>
            <Area label="Address" value={c.brand.address} onChange={set(["brand", "address"])} rows={2} />
          </Panel>

          <Panel id="hero" title="Hero" desc="The first screen, over the 3D scene at dusk.">
            <Text label="Small line above the title" value={c.hero.eyebrow} onChange={set(["hero", "eyebrow"])} />
            <Text label="Title" value={c.hero.title} onChange={set(["hero", "title"])} />
            <Area label="Subtitle" value={c.hero.subtitle} onChange={set(["hero", "subtitle"])} rows={2} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Text label="Main button" value={c.hero.primaryCta} onChange={set(["hero", "primaryCta"])} />
              <Text label="Second button" value={c.hero.secondaryCta} onChange={set(["hero", "secondaryCta"])} />
            </div>
          </Panel>

          <Panel id="chapters" title="3D chapters" desc="Four scroll chapters. Each one is tied to a scene: light, less, nature, flow.">
            <ListEditor
              fixed
              items={c.chapters}
              onChange={set(["chapters"])}
              make={() => c.chapters[0]}
              itemLabel={(ch, i) => `${["Light", "Less", "Nature", "Flow"][i]} — ${ch.title}`}
              render={(ch, patch) => (
                <>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Text label="Label" value={ch.label} onChange={(v) => patch({ label: v })} />
                    <Text label="Architect / credit" value={ch.architect} onChange={(v) => patch({ architect: v })} />
                  </div>
                  <Text label="Title" value={ch.title} onChange={(v) => patch({ title: v })} />
                  <Text label="Quote" value={ch.quote} onChange={(v) => patch({ quote: v })} />
                  <Area label="Text" value={ch.body} onChange={(v) => patch({ body: v })} />
                </>
              )}
            />
          </Panel>

          <Panel id="finale" title="Closing quote" desc="The night-time crane shot at the end of the 3D story.">
            <Area label="Quote" value={c.finale.quote} onChange={set(["finale", "quote"])} rows={2} />
            <div className="grid gap-5 sm:grid-cols-2">
              <Text label="Author" value={c.finale.author} onChange={set(["finale", "author"])} />
              <Text label="Button" value={c.finale.cta} onChange={set(["finale", "cta"])} />
            </div>
          </Panel>

          <Panel id="studio" title="Studio" desc="About section below the 3D story.">
            <Text label="Small heading" value={c.studio.eyebrow} onChange={set(["studio", "eyebrow"])} />
            <Text label="Title" value={c.studio.title} onChange={set(["studio", "title"])} />
            <Area label="Text" value={c.studio.body} onChange={set(["studio", "body"])} rows={5} />
            <ImageField label="Image" value={c.studio.image} onChange={set(["studio", "image"])} />
            <Text label="Image description (for screen readers)" value={c.studio.imageAlt} onChange={set(["studio", "imageAlt"])} />
          </Panel>

          <Panel id="services" title="Services">
            <Text label="Title" value={c.services.title} onChange={set(["services", "title"])} />
            <Area label="Intro" value={c.services.intro} onChange={set(["services", "intro"])} rows={2} />
            <ListEditor
              items={c.services.items}
              onChange={set(["services", "items"])}
              max={12}
              make={() => ({ icon: "home" as IconName, title: "", body: "" })}
              itemLabel={(s) => s.title}
              render={(s, patch) => (
                <>
                  <Field label="Icon">
                    <div className="flex flex-wrap gap-2">
                      {ICONS.map((ic) => (
                        <button
                          key={ic}
                          type="button"
                          onClick={() => patch({ icon: ic })}
                          aria-label={ic}
                          className={`grid h-11 w-11 place-items-center rounded-xl border transition ${
                            s.icon === ic ? "border-sand-400 bg-sand-400/10 text-sand-300" : "border-white/10 text-white/50 hover:text-white"
                          }`}
                        >
                          <Icon name={ic} className="h-6 w-6" />
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Text label="Title" value={s.title} onChange={(v) => patch({ title: v })} />
                  <Area label="Text" value={s.body} onChange={(v) => patch({ body: v })} rows={2} />
                </>
              )}
            />
          </Panel>

          <Panel id="stats" title="Numbers" desc="Optional. Hidden when empty — add only real figures.">
            <ListEditor
              items={c.stats}
              onChange={set(["stats"])}
              max={6}
              make={() => ({ value: "", label: "" })}
              itemLabel={(s) => [s.value, s.label].filter(Boolean).join(" ")}
              render={(s, patch) => (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Text label="Number" value={s.value} onChange={(v) => patch({ value: v })} placeholder="12+" />
                  <Text label="Label" value={s.label} onChange={(v) => patch({ label: v })} placeholder="Years of practice" />
                </div>
              )}
            />
          </Panel>

          <Panel id="projects" title="Projects" desc="The portfolio carousel. The first project shows larger.">
            <Text label="Title" value={c.projects.title} onChange={set(["projects", "title"])} />
            <Area label="Intro" value={c.projects.intro} onChange={set(["projects", "intro"])} rows={2} />
            <ListEditor
              items={c.projects.items}
              onChange={set(["projects", "items"])}
              make={() => ({ title: "", location: "", category: "", year: "", image: "", summary: "" })}
              itemLabel={(p) => p.title}
              render={(p, patch) => (
                <>
                  <ImageField label="Image" value={p.image} onChange={(v) => patch({ image: v })} />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Text label="Title" value={p.title} onChange={(v) => patch({ title: v })} />
                    <Text label="Location" value={p.location} onChange={(v) => patch({ location: v })} />
                    <Text label="Category" value={p.category} onChange={(v) => patch({ category: v })} />
                    <Text label="Year" value={p.year} onChange={(v) => patch({ year: v })} />
                  </div>
                  <Area label="Short description (optional)" value={p.summary} onChange={(v) => patch({ summary: v })} rows={2} />
                </>
              )}
            />
          </Panel>

          <Panel id="process" title="Process">
            <Text label="Title" value={c.process.title} onChange={set(["process", "title"])} />
            <ListEditor
              items={c.process.steps}
              onChange={set(["process", "steps"])}
              max={8}
              make={() => ({ title: "", body: "" })}
              itemLabel={(s) => s.title}
              render={(s, patch) => (
                <>
                  <Text label="Step" value={s.title} onChange={(v) => patch({ title: v })} />
                  <Area label="Text" value={s.body} onChange={(v) => patch({ body: v })} rows={2} />
                </>
              )}
            />
          </Panel>

          <Panel id="testimonials" title="Testimonials" desc="Optional. Hidden when empty — use real client words only.">
            <Text label="Title" value={c.testimonials.title} onChange={set(["testimonials", "title"])} />
            <ListEditor
              items={c.testimonials.items}
              onChange={set(["testimonials", "items"])}
              max={12}
              make={() => ({ quote: "", name: "", location: "" })}
              itemLabel={(t) => t.name}
              render={(t, patch) => (
                <>
                  <Area label="Quote" value={t.quote} onChange={(v) => patch({ quote: v })} rows={3} />
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Text label="Name" value={t.name} onChange={(v) => patch({ name: v })} />
                    <Text label="City" value={t.location} onChange={(v) => patch({ location: v })} />
                  </div>
                </>
              )}
            />
          </Panel>

          <Panel id="contact" title="Contact form" desc="Submissions appear under Admin → Inquiries.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Text label="Small heading" value={c.contact.eyebrow} onChange={set(["contact", "eyebrow"])} />
              <Text label="Button" value={c.contact.button} onChange={set(["contact", "button"])} />
            </div>
            <Text label="Big heading" value={c.contact.title} onChange={set(["contact", "title"])} />
            <Area label="Text" value={c.contact.body} onChange={set(["contact", "body"])} rows={2} />
            <Text label="Thank-you message" value={c.contact.success} onChange={set(["contact", "success"])} />
          </Panel>

          <Panel id="moodboard" title="Moodboard page" desc="Text on studiogreyspaces.com/moodboard. Boards themselves are managed under Admin → Moodboard.">
            <ListEditor
              items={c.moodboard.headlines}
              onChange={set(["moodboard", "headlines"])}
              max={6}
              make={() => ""}
              itemLabel={(h) => h}
              render={(h, _patch, i) => (
                <Text
                  label="Rotating headline"
                  value={h}
                  onChange={(v) => setC((prev) => setIn(prev, ["moodboard", "headlines", i], v))}
                />
              )}
            />
            <Area label="Subtitle" value={c.moodboard.subtitle} onChange={set(["moodboard", "subtitle"])} rows={2} />
            <Text label="Intro title" value={c.moodboard.introTitle} onChange={set(["moodboard", "introTitle"])} />
            <Area label="Intro text" value={c.moodboard.introBody} onChange={set(["moodboard", "introBody"])} rows={3} />
          </Panel>

          <Panel id="seo" title="Search & sharing" desc="Title and description for Google and link previews.">
            <Text label="Page title" value={c.seo.title} onChange={set(["seo", "title"])} hint={`${c.seo.title.length}/60`} />
            <Area label="Description" value={c.seo.description} onChange={set(["seo", "description"])} rows={2} hint={`${c.seo.description.length}/160`} />
          </Panel>

          <div className="flex justify-end pb-16">
            <button
              onClick={save}
              disabled={!dirty || status === "saving"}
              className="rounded-full bg-white px-7 py-3 text-sm font-medium text-ink-950 transition hover:bg-sand-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {status === "saving" ? "Saving…" : dirty ? "Save changes" : "All changes saved"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
