"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SiteContent } from "@/lib/siteSchema";
import ContactForm from "./ContactForm";
import { ArchPlaceholder, Icon } from "./Icons";
import ProjectsCarousel from "./ProjectsCarousel";
import { KEYFRAMES } from "./scene/keyframes";
import type { SceneHandle } from "./scene/architecture";

const NAV = [
  { href: "#studio", label: "Studio" },
  { href: "#work", label: "Work" },
  { href: "#services", label: "Services" },
  { href: "#contact", label: "Contact" },
];

export default function HomeExperience({ content }: { content: SiteContent }) {
  const c = content;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const storyRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const sceneRef = useRef<SceneHandle | null>(null);

  const [ready, setReady] = useState(false);
  const [noGL, setNoGL] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [storyVisible, setStoryVisible] = useState(true);
  const [chapter, setChapter] = useState(-1);
  const [menuOpen, setMenuOpen] = useState(false);

  // --- 3D scene lifecycle
  useEffect(() => {
    let disposed = false;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    import("./scene/architecture")
      .then(({ createArchitectureScene }) => {
        if (disposed) return;
        try {
          sceneRef.current = createArchitectureScene(canvas, { onReady: () => setReady(true), reducedMotion: reduced });
          computeAnchors();
          sceneRef.current.setScroll(window.scrollY);
        } catch {
          setNoGL(true);
          setReady(true);
        }
      })
      .catch(() => {
        setNoGL(true);
        setReady(true);
      });

    return () => {
      disposed = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function computeAnchors() {
    const tops = sectionRefs.current.map((el) => {
      if (!el) return { top: 0, h: 0 };
      const r = el.getBoundingClientRect();
      return { top: r.top + window.scrollY, h: r.height };
    });
    const anchors = KEYFRAMES.map((k) => {
      const s = tops[k.at[0]] || { top: 0, h: 0 };
      return s.top + k.at[1] * s.h;
    });
    for (let i = 1; i < anchors.length; i++) anchors[i] = Math.max(anchors[i], anchors[i - 1] + 1);
    sceneRef.current?.setAnchors(anchors);
    return tops;
  }

  // --- scroll, resize, pointer, visibility
  useEffect(() => {
    let tops = computeAnchors();
    let ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        const y = window.scrollY;
        const vh = window.innerHeight;
        sceneRef.current?.setScroll(y);
        setScrolled(y > 24);
        if (heroRef.current) {
          const f = Math.min(1, y / (vh * 0.7));
          heroRef.current.style.opacity = String(1 - f);
          heroRef.current.style.transform = `translate3d(0, ${f * -40}px, 0) scale(${1 - f * 0.04})`;
        }
        let active = -1;
        for (let i = 1; i <= 4; i++) {
          const t = tops[i];
          if (t && y + vh * 0.5 >= t.top && y + vh * 0.5 < t.top + t.h) active = i - 1;
        }
        setChapter(active);
      });
    }
    function onResize() {
      tops = computeAnchors();
      sceneRef.current?.resize();
      onScroll();
    }
    function onPointer(e: PointerEvent) {
      sceneRef.current?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    }
    function onVisibility() {
      sceneRef.current?.setActive(!document.hidden && storyInView);
    }

    let storyInView = true;
    const io = new IntersectionObserver(
      ([entry]) => {
        storyInView = entry.isIntersecting;
        setStoryVisible(entry.isIntersecting);
        sceneRef.current?.setActive(entry.isIntersecting && !document.hidden);
      },
      { rootMargin: "0px 0px 0px 0px" },
    );
    if (storyRef.current) io.observe(storyRef.current);

    const ro = new ResizeObserver(() => onResize());
    if (storyRef.current) ro.observe(storyRef.current);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    onScroll();
    return () => {
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- reveal-on-scroll for the solid sections
  useEffect(() => {
    const els = document.querySelectorAll<HTMLElement>("[data-reveal]");
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        }),
      { rootMargin: "0px 0px -10% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const setSection = (i: number) => (el: HTMLElement | null) => {
    sectionRefs.current[i] = el;
  };

  const year = new Date().getFullYear();

  return (
    <div className="home-root bg-ink-950 text-white">
      {/* ---------- 3D canvas */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-0 transition-opacity duration-700 ${storyVisible ? "opacity-100" : "opacity-0"}`}
      >
        <canvas ref={canvasRef} className="h-full w-full" />
        {noGL ? <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_30%,#5a4a3e_0%,#1a1714_55%,#0b0b0c_100%)]" /> : null}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(0,0,0,0.55)_100%)]" />
        <div className="grain pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay" />
      </div>

      {/* ---------- loader */}
      <div
        className={`fixed inset-0 z-50 grid place-items-center bg-ink-950 transition-opacity duration-1000 ${ready ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <div className="text-center">
          <p className="text-[11px] uppercase tracking-[0.5em] text-white/50">{c.brand.name}</p>
          <div className="mx-auto mt-6 h-px w-40 overflow-hidden bg-white/10">
            <div className="loader-bar h-full w-1/3 bg-sand-400" />
          </div>
        </div>
      </div>

      {/* ---------- nav */}
      <header
        className={`fixed inset-x-0 top-0 z-40 transition-all duration-500 ${
          scrolled || menuOpen ? "border-b border-white/[0.06] bg-ink-950/55 backdrop-blur-2xl backdrop-saturate-150" : ""
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="text-[13px] font-medium uppercase tracking-[0.32em] text-white">
            {c.brand.name}
          </Link>
          <div className="hidden items-center gap-9 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="text-[13px] text-white/70 transition hover:text-white">
                {n.label}
              </a>
            ))}
            <Link href="/moodboard" className="text-[13px] text-white/70 transition hover:text-white">
              Moodboard
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#contact"
              className="hidden rounded-full bg-white px-5 py-2 text-[13px] font-medium text-ink-950 transition hover:bg-sand-300 sm:inline-block"
            >
              {c.hero.primaryCta}
            </a>
            <button
              className="grid h-10 w-10 place-items-center rounded-full text-white md:hidden"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                {menuOpen ? <path d="M6 6l12 12M18 6 6 18" /> : <path d="M4 9h16M4 15h16" />}
              </svg>
            </button>
          </div>
        </nav>
        {menuOpen ? (
          <div className="border-t border-white/[0.06] px-5 pb-8 pt-4 md:hidden">
            {[...NAV, { href: "/moodboard", label: "Moodboard" }].map((n) => (
              <a
                key={n.href}
                href={n.href}
                onClick={() => setMenuOpen(false)}
                className="block py-3 text-2xl font-light text-white/90"
              >
                {n.label}
              </a>
            ))}
          </div>
        ) : null}
      </header>

      {/* ---------- chapter index */}
      <div
        className={`fixed right-5 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-4 transition-opacity duration-500 lg:flex ${
          chapter >= 0 ? "opacity-100" : "opacity-0"
        }`}
      >
        {c.chapters.map((ch, i) => (
          <div key={i} className="flex items-center justify-end gap-3">
            <span className={`text-[10px] uppercase tracking-[0.25em] transition ${chapter === i ? "text-white" : "text-white/0"}`}>
              {ch.label}
            </span>
            <span className={`block h-px transition-all duration-500 ${chapter === i ? "w-8 bg-sand-400" : "w-4 bg-white/30"}`} />
          </div>
        ))}
      </div>

      {/* ---------- story over the 3D scene */}
      <div ref={storyRef} className="relative z-10">
        <section ref={setSection(0)} className="relative h-[100svh]">
          <div
            ref={heroRef}
            className="flex h-full flex-col items-center justify-center px-6 text-center will-change-transform [text-shadow:0_2px_40px_rgba(0,0,0,0.35)]"
          >
            <p className="hero-in text-[11px] uppercase tracking-[0.45em] text-white/70" style={{ animationDelay: "0.2s" }}>
              {c.hero.eyebrow}
            </p>
            <h1
              className="hero-in mt-6 text-[clamp(3.2rem,11vw,10rem)] font-extralight leading-[0.92] tracking-[-0.035em] text-white"
              style={{ animationDelay: "0.35s" }}
            >
              {c.hero.title}
            </h1>
            <p
              className="hero-in mx-auto mt-7 max-w-xl text-[clamp(1rem,1.6vw,1.25rem)] font-light leading-relaxed text-white/75"
              style={{ animationDelay: "0.55s" }}
            >
              {c.hero.subtitle}
            </p>
            <div className="hero-in mt-10 flex flex-col items-center gap-3 sm:flex-row" style={{ animationDelay: "0.7s" }}>
              <a href="#contact" className="rounded-full bg-white px-7 py-3.5 text-sm font-medium text-ink-950 transition hover:bg-sand-300">
                {c.hero.primaryCta}
              </a>
              <a
                href="#chapter-1"
                className="rounded-full border border-white/25 px-7 py-3.5 text-sm font-medium text-white backdrop-blur-sm transition hover:border-white/60"
              >
                {c.hero.secondaryCta}
              </a>
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-8 flex flex-col items-center gap-3 text-[10px] uppercase tracking-[0.35em] text-white/50">
            Scroll
            <span className="scroll-line block h-10 w-px bg-gradient-to-b from-white/60 to-transparent" />
          </div>
        </section>

        {c.chapters.map((ch, i) => (
          <section key={i} id={`chapter-${i + 1}`} ref={setSection(i + 1)} className="relative h-[160vh]">
            <div
              className={`sticky top-0 flex h-[100svh] items-end px-4 pb-8 sm:px-8 md:items-center md:pb-0 ${
                i % 2 ? "md:justify-end" : "md:justify-start"
              }`}
            >
              <article
                className={`chapter-card w-full max-w-[460px] rounded-[28px] border border-white/10 bg-black/30 p-7 backdrop-blur-xl sm:p-9 md:mx-[4vw] ${
                  chapter === i ? "is-active" : ""
                }`}
              >
                <p className="flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-sand-300">
                  <span className="tabular-nums text-white/50">0{i + 1}</span>
                  <span className="h-px w-6 bg-sand-400/60" />
                  {ch.label}
                </p>
                <h2 className="mt-5 text-[clamp(1.9rem,3.4vw,3rem)] font-light leading-[1.05] tracking-[-0.02em] text-white">
                  {ch.title}
                </h2>
                <blockquote className="mt-6 border-l border-sand-400/50 pl-4">
                  <p className="font-display text-xl italic leading-snug text-sand-300 sm:text-2xl">“{ch.quote}”</p>
                  <footer className="mt-2 text-[11px] uppercase tracking-[0.25em] text-white/50">{ch.architect}</footer>
                </blockquote>
                <p className="mt-6 text-[15px] leading-relaxed text-white/70">{ch.body}</p>
              </article>
            </div>
          </section>
        ))}

        <section ref={setSection(5)} className="relative flex h-[130vh] items-start justify-center">
          <div className="sticky top-0 flex h-[100svh] flex-col items-center justify-center px-6 text-center">
            <p className="font-display text-[clamp(2rem,5vw,4.2rem)] font-normal italic leading-[1.1] text-white">
              “{c.finale.quote}”
            </p>
            <p className="mt-5 text-[11px] uppercase tracking-[0.35em] text-white/55">{c.finale.author}</p>
            <a href="#contact" className="mt-10 rounded-full bg-white px-7 py-3.5 text-sm font-medium text-ink-950 transition hover:bg-sand-300">
              {c.finale.cta}
            </a>
          </div>
        </section>
      </div>

      {/* ---------- solid content */}
      <main className="relative z-10 bg-ink-950">
        <section id="studio" className="mx-auto grid max-w-7xl gap-12 px-5 py-28 sm:px-8 md:grid-cols-2 md:items-center md:gap-20 md:py-40">
          <div data-reveal>
            <p className="text-[11px] uppercase tracking-[0.35em] text-sand-400">{c.studio.eyebrow}</p>
            <h2 className="mt-5 text-[clamp(2.2rem,4.4vw,3.8rem)] font-light leading-[1.04] tracking-[-0.025em]">{c.studio.title}</h2>
            <p className="mt-7 max-w-lg whitespace-pre-line text-[17px] leading-relaxed text-white/60">{c.studio.body}</p>
          </div>
          <div data-reveal className="relative aspect-[4/5] overflow-hidden rounded-[28px] bg-ink-900">
            {c.studio.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.studio.image} alt={c.studio.imageAlt} className="h-full w-full object-cover" loading="lazy" />
            ) : (
              <ArchPlaceholder variant={1} label="Add studio image in admin" />
            )}
          </div>
        </section>

        <section id="services" className="border-t border-white/[0.06]">
          <div className="mx-auto max-w-7xl px-5 py-28 sm:px-8 md:py-36">
            <div data-reveal className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <h2 className="text-[clamp(2rem,4vw,3.4rem)] font-light tracking-[-0.025em]">{c.services.title}</h2>
              <p className="max-w-md text-[17px] leading-relaxed text-white/55">{c.services.intro}</p>
            </div>
            <div className="mt-14 grid border-l border-t border-white/10 sm:grid-cols-2 lg:grid-cols-4">
              {c.services.items.map((s, i) => (
                <div
                  key={i}
                  data-reveal
                  style={{ transitionDelay: `${i * 80}ms` }}
                  className="group border-b border-r border-white/10 p-8 transition-colors duration-500 hover:bg-white/[0.03] md:p-10"
                >
                  <Icon name={s.icon} className="h-9 w-9 text-sand-300 transition duration-500 group-hover:-translate-y-1" />
                  <h3 className="mt-10 text-lg font-normal">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/50">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {c.stats.length ? (
          <section className="border-t border-white/[0.06]">
            <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-5 py-24 sm:px-8 md:grid-cols-4">
              {c.stats.map((s, i) => (
                <div key={i} data-reveal style={{ transitionDelay: `${i * 80}ms` }}>
                  <p className="text-[clamp(2.6rem,5vw,4.5rem)] font-extralight tracking-[-0.03em] text-white">{s.value}</p>
                  <p className="mt-2 text-sm text-white/50">{s.label}</p>
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {c.projects.items.length ? (
          <section id="work" className="border-t border-white/[0.06]">
            <div className="mx-auto max-w-7xl px-5 py-28 sm:px-8 md:py-36">
              <div data-reveal className="mb-4 flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-sand-400">Portfolio</p>
                  <h2 className="mt-4 text-[clamp(2rem,4vw,3.4rem)] font-light tracking-[-0.025em]">{c.projects.title}</h2>
                </div>
                <p className="max-w-md text-[17px] leading-relaxed text-white/55">{c.projects.intro}</p>
              </div>
              <div data-reveal>
                <ProjectsCarousel items={c.projects.items} />
              </div>
            </div>
          </section>
        ) : null}

        {c.process.steps.length ? (
          <section className="border-t border-white/[0.06]">
            <div className="mx-auto max-w-7xl px-5 py-28 sm:px-8 md:py-36">
              <h2 data-reveal className="text-[clamp(2rem,4vw,3.4rem)] font-light tracking-[-0.025em]">{c.process.title}</h2>
              <ol className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
                {c.process.steps.map((s, i) => (
                  <li key={i} data-reveal style={{ transitionDelay: `${i * 90}ms` }} className="border-t border-white/15 pt-6">
                    <span className="text-sm tabular-nums text-sand-400">0{i + 1}</span>
                    <h3 className="mt-4 text-2xl font-light">{s.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-white/50">{s.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        ) : null}

        {c.testimonials.items.length ? (
          <section className="border-t border-white/[0.06]">
            <div className="mx-auto max-w-7xl px-5 py-28 sm:px-8 md:py-36">
              <h2 data-reveal className="max-w-md text-[clamp(2rem,4vw,3.4rem)] font-light uppercase leading-[1.02] tracking-[-0.02em] text-sand-300">
                {c.testimonials.title}
              </h2>
              <div className="mt-14 grid gap-6 md:grid-cols-2">
                {c.testimonials.items.map((t, i) => (
                  <figure key={i} data-reveal style={{ transitionDelay: `${i * 90}ms` }} className="flex gap-6 rounded-[22px] border border-white/10 p-8 md:p-10">
                    <span className="font-display text-7xl leading-none text-sand-300/90">“</span>
                    <div>
                      <blockquote className="text-[15px] leading-relaxed text-white/75">{t.quote}</blockquote>
                      <figcaption className="mt-8">
                        <p className="text-sm text-white">{t.name}</p>
                        <p className="text-xs text-white/40">{t.location}</p>
                      </figcaption>
                    </div>
                  </figure>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        <section id="contact" className="border-t border-white/[0.06]">
          <div className="mx-auto grid max-w-7xl gap-14 px-5 py-28 sm:px-8 md:grid-cols-[1.1fr_1fr] md:gap-20 md:py-40">
            <div data-reveal>
              <p className="text-[11px] uppercase tracking-[0.35em] text-white/40">{c.contact.eyebrow}</p>
              <h2 className="mt-5 text-[clamp(2.6rem,6.2vw,5.6rem)] font-light uppercase leading-[0.95] tracking-[-0.03em] text-sand-300">
                {c.contact.title}
              </h2>
            </div>
            <div data-reveal>
              <p className="max-w-sm text-[15px] leading-relaxed text-white/55">{c.contact.body}</p>
              <div className="mt-8">
                <ContactForm button={c.contact.button} success={c.contact.success} />
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/[0.06]">
          <div className="mx-auto max-w-7xl px-5 pb-10 pt-20 sm:px-8">
            <div className="grid gap-12 md:grid-cols-[2fr_1fr_1fr_1fr]">
              <div>
                <p className="text-[clamp(2rem,5vw,3.6rem)] font-extralight tracking-[-0.03em]">{c.brand.name}</p>
                <p className="mt-2 text-sm text-white/45">{c.brand.tagline}</p>
              </div>
              <div className="space-y-3 text-sm">
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">Studio</p>
                {NAV.map((n) => (
                  <a key={n.href} href={n.href} className="block text-white/65 hover:text-white">
                    {n.label}
                  </a>
                ))}
              </div>
              <div className="space-y-3 text-sm">
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">Contact</p>
                {c.brand.email ? (
                  <a href={`mailto:${c.brand.email}`} className="block text-white/65 hover:text-white">
                    {c.brand.email}
                  </a>
                ) : null}
                {c.brand.phone ? (
                  <a href={`tel:${c.brand.phone.replace(/\s+/g, "")}`} className="block text-white/65 hover:text-white">
                    {c.brand.phone}
                  </a>
                ) : null}
                {c.brand.address ? <p className="whitespace-pre-line text-white/45">{c.brand.address}</p> : null}
              </div>
              <div className="space-y-3 text-sm">
                <p className="text-[11px] uppercase tracking-[0.3em] text-white/35">Clients</p>
                <Link href="/moodboard" className="block text-white/65 hover:text-white">
                  Moodboard
                </Link>
                {c.brand.instagram ? (
                  <a href={c.brand.instagram} target="_blank" rel="noopener noreferrer" className="block text-white/65 hover:text-white">
                    Instagram
                  </a>
                ) : null}
                {c.brand.linkedin ? (
                  <a href={c.brand.linkedin} target="_blank" rel="noopener noreferrer" className="block text-white/65 hover:text-white">
                    LinkedIn
                  </a>
                ) : null}
              </div>
            </div>
            <div className="mt-16 flex flex-col justify-between gap-3 border-t border-white/[0.06] pt-6 text-xs text-white/35 sm:flex-row">
              <p>
                © {year} {c.brand.name}
              </p>
              <Link href="/admin" className="hover:text-white/70">
                Team
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
