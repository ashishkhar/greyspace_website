import Link from "next/link";
import BoardEntryForm from "@/components/BoardEntryForm";
import GreyspacesHeroHeadline from "@/components/GreyspacesHeroHeadline";
import { DEFAULT_SAMPLE_BOARD_CODE } from "@/lib/sampleBoard";
import { getBoards } from "@/lib/localStore";
import { getSiteContent } from "@/lib/siteContent";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Section({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`mx-auto w-full max-w-3xl px-6 ${className}`}>
      {children}
    </section>
  );
}

export const metadata = {
  title: "Moodboard — Grey Spaces",
  description: "Review curated design concepts and share your thoughts.",
};

export default async function MoodboardPage() {
  const [boards, site] = await Promise.all([getBoards(), getSiteContent()]);
  const mood = site.moodboard;
  const sampleBoard =
    boards.find((b) => b.code.toUpperCase() === DEFAULT_SAMPLE_BOARD_CODE) ??
    boards.find((b) => b.name.trim().toLowerCase() === "sample board") ??
    [...boards].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  const sampleHref = sampleBoard
    ? `/board/${encodeURIComponent(sampleBoard.code)}`
    : `/board/${DEFAULT_SAMPLE_BOARD_CODE}`;

  return (
    <div className="min-h-screen bg-gradient-to-b from-charcoal-950 via-charcoal-950 to-charcoal-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-8 md:py-10">
        <div className="flex min-w-0 flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
          <span className="font-display text-2xl tracking-[0.1em] text-zinc-100 sm:text-3xl md:text-4xl">
            MOODBOARD
          </span>
          <span className="font-display text-[10px] font-normal uppercase tracking-[0.22em] text-zinc-500 sm:text-xs md:text-sm">
            BY GREY SPACES
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500 transition hover:text-zinc-300"
          >
            Studio
          </Link>
          <Link
            href="/admin"
            className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-600 transition hover:text-zinc-400"
          >
            Team
          </Link>
        </div>
      </header>

      {/* Hero */}
      <Section className="pb-24 pt-6 text-center md:pb-32 md:pt-10">
        <GreyspacesHeroHeadline lines={mood.headlines} />
        <p className="mx-auto mt-8 max-w-xl text-lg leading-relaxed text-zinc-400 md:text-xl">
          {mood.subtitle}
        </p>
        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-6">
          <a
            href="#enter-board"
            className="inline-flex min-w-[220px] justify-center rounded-sm border border-gold-500/50 bg-gold-500/10 px-8 py-3.5 text-sm font-medium uppercase tracking-[0.18em] text-gold-400 transition hover:border-gold-400/70 hover:bg-gold-500/15"
          >
            Enter your board code
          </a>
          {sampleHref ? (
            <Link
              href={sampleHref}
              className="text-sm text-zinc-500 underline-offset-4 transition hover:text-zinc-300 hover:underline"
            >
              Try a sample board
            </Link>
          ) : null}
        </div>
        <p className="mx-auto mt-16 max-w-md text-sm italic leading-relaxed text-zinc-600">
          Take your time. There’s no rush.
        </p>
      </Section>

      <div className="mx-auto h-px w-full max-w-2xl bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      {/* What this is */}
      <Section className="py-24 md:py-28">
        <h2 className="font-display text-center text-2xl font-medium text-zinc-200 md:text-3xl">
          {mood.introTitle}
        </h2>
        <p className="mx-auto mt-8 max-w-2xl text-center text-lg leading-relaxed text-zinc-500">
          {mood.introBody}
        </p>
      </Section>

      {/* Experience preview */}
      <Section className="pb-24 md:pb-28">
        <h2 className="font-display text-center text-2xl font-medium text-zinc-200 md:text-3xl">
          Effortless, on your terms
        </h2>
        <ul className="mx-auto mt-14 grid max-w-2xl gap-12 md:grid-cols-3 md:gap-8">
          {[
            { title: "Swipe through curated designs", hint: "Move at the pace that feels right." },
            { title: "Tap what speaks to you", hint: "Select what feels right to you." },
            { title: "Leave a quick note", hint: "Every choice helps refine your space." },
          ].map((item) => (
            <li key={item.title} className="text-center">
              <p className="font-display text-lg text-zinc-200 md:text-xl">{item.title}</p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-600">{item.hint}</p>
            </li>
          ))}
        </ul>
      </Section>

      <div className="mx-auto h-px w-full max-w-2xl bg-gradient-to-r from-transparent via-zinc-800 to-transparent" />

      {/* How it works */}
      <Section className="py-24 md:py-28">
        <h2 className="font-display text-center text-2xl font-medium text-zinc-200 md:text-3xl">
          How it works
        </h2>
        <ol className="mx-auto mt-16 max-w-lg space-y-12">
          {[
            {
              step: "1",
              title: "Enter your code",
              body: "Use the code shared with you—just for this presentation.",
            },
            {
              step: "2",
              title: "Explore",
              body: "Browse through the concepts prepared for your space.",
            },
            {
              step: "3",
              title: "Respond",
              body: "Share what resonates. There are no wrong answers.",
            },
          ].map((item) => (
            <li key={item.step} className="flex gap-6">
              <span className="font-display text-3xl tabular-nums text-gold-500/80">{item.step}</span>
              <div>
                <p className="font-display text-xl text-zinc-200">{item.title}</p>
                <p className="mt-2 leading-relaxed text-zinc-500">{item.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {/* Reassurance */}
      <Section className="pb-24 md:pb-28">
        <blockquote className="mx-auto max-w-2xl border-l-2 border-gold-500/30 pl-8 text-left">
          <p className="font-display text-2xl font-normal leading-snug text-zinc-300 md:text-3xl">
            Your feedback helps shape the final design of your space.
          </p>
          <p className="mt-6 text-sm uppercase tracking-[0.25em] text-zinc-600">
            Simple. Clear. Collaborative.
          </p>
        </blockquote>
      </Section>

      {/* CTA + form */}
      <Section id="enter-board" className="pb-28 pt-4 text-center md:pb-36">
        <h2 className="font-display text-3xl font-medium text-zinc-100 md:text-4xl">Ready to begin?</h2>
        <p className="mx-auto mt-4 max-w-md text-zinc-500">
          Your private presentation is waiting.
        </p>
        <div className="mx-auto mt-12 flex justify-center">
          <BoardEntryForm variant="landing" />
        </div>
        <p className="mx-auto mt-10 max-w-sm text-sm text-zinc-600">
          Prefer to browse first?{" "}
          {sampleHref ? (
            <Link href={sampleHref} className="text-zinc-400 underline-offset-4 hover:underline">
              See a sample
            </Link>
          ) : (
            <span className="text-zinc-500">Ask your designer for a code.</span>
          )}
        </p>
      </Section>

      {/* Bottom CTA strip */}
      <div className="border-t border-zinc-900/80 bg-charcoal-900/30 py-16 text-center">
        <p className="font-display text-xl text-zinc-300 md:text-2xl">Open your board</p>
        <Link
          href="/board"
          className="mt-6 inline-block rounded-sm border border-zinc-700 px-10 py-3 text-sm uppercase tracking-[0.2em] text-zinc-300 transition hover:border-gold-500/40 hover:text-gold-400"
        >
          Continue
        </Link>
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-900/60 px-6 py-12">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
              <span className="font-display text-lg tracking-[0.1em] text-zinc-300 sm:text-xl">
                MOODBOARD
              </span>
              <span className="font-display text-[10px] uppercase tracking-[0.2em] text-zinc-600 sm:text-xs">
                BY GREY SPACES
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-600">Designed for thoughtful spaces.</p>
          </div>
          <p className="max-w-xs text-xs leading-relaxed text-zinc-700">
            A private, curated design experience made just for you.
          </p>
        </div>
      </footer>
    </div>
  );
}
