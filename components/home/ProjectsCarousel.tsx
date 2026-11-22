"use client";

import { useRef } from "react";
import type { SiteContent } from "@/lib/siteSchema";
import { ArchPlaceholder } from "./Icons";

type Item = SiteContent["projects"]["items"][number];

export default function ProjectsCarousel({ items }: { items: Item[] }) {
  const track = useRef<HTMLDivElement>(null);

  function go(dir: 1 | -1) {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = card ? card.offsetWidth + 24 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  return (
    <div>
      <div className="mb-8 flex justify-end gap-2">
        {([-1, 1] as const).map((d) => (
          <button
            key={d}
            onClick={() => go(d)}
            aria-label={d < 0 ? "Previous project" : "Next project"}
            className="grid h-11 w-11 place-items-center rounded-full border border-white/15 text-white/80 transition hover:border-sand-400/60 hover:text-sand-300"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
              <path d={d < 0 ? "M19 12H5M11 6l-6 6 6 6" : "M5 12h14M13 6l6 6-6 6"} />
            </svg>
          </button>
        ))}
      </div>
      <div
        ref={track}
        className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-4 pb-4 [scrollbar-width:none] sm:-mx-8 sm:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((p, i) => (
          <article
            key={`${p.title}-${i}`}
            data-card
            className={`group shrink-0 snap-start ${i === 0 ? "w-[86vw] sm:w-[640px]" : "w-[72vw] sm:w-[340px]"}`}
          >
            <div className={`relative overflow-hidden rounded-[22px] bg-ink-900 ${i === 0 ? "aspect-[16/11]" : "aspect-[4/5]"}`}>
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image}
                  alt={p.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition duration-[900ms] ease-[cubic-bezier(.2,.7,.2,1)] group-hover:scale-[1.04]"
                />
              ) : (
                <ArchPlaceholder variant={i} label="Add image in admin" />
              )}
              {p.category ? (
                <span className="absolute left-4 top-4 rounded-full bg-black/35 px-3 py-1 text-[11px] font-medium tracking-wide text-white/90 backdrop-blur-md">
                  {p.category}
                </span>
              ) : null}
            </div>
            <div className="mt-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[15px] font-medium uppercase tracking-[0.08em] text-white">{p.title}</h3>
                <p className="mt-1 text-sm text-white/45">{p.location}</p>
              </div>
              {p.year ? <span className="text-sm tabular-nums text-white/35">{p.year}</span> : null}
            </div>
            {p.summary ? <p className="mt-3 max-w-md text-sm leading-relaxed text-white/55">{p.summary}</p> : null}
          </article>
        ))}
      </div>
    </div>
  );
}
