"use client";

/**
 * Matches the landing page Greyspaces wordmark scale (see app/page.tsx header).
 */
export default function GreyspacesPresentationHeader({
  boardName,
  currentIndex,
  total,
}: {
  boardName: string;
  currentIndex: number;
  total: number;
}) {
  return (
    <header className="flex w-full flex-col gap-4 border-b border-zinc-800/80 bg-charcoal-950/80 px-6 py-8 backdrop-blur-sm md:flex-row md:items-end md:justify-between md:py-10">
      <div className="min-w-0">
        <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-2">
          <span className="font-display text-xl tracking-[0.1em] text-zinc-100 sm:text-2xl md:text-3xl">
            MOODBOARD
          </span>
          <span className="font-display text-[9px] font-normal uppercase tracking-[0.2em] text-zinc-500 sm:text-[10px] md:text-xs">
            BY GREY SPACES
          </span>
        </div>
        <p className="mt-2 truncate text-sm font-medium text-zinc-300 md:text-base">{boardName}</p>
      </div>
      <p className="shrink-0 text-sm tabular-nums text-zinc-400">
        {total > 0 ? (
          <>
            {currentIndex + 1} / {total}
          </>
        ) : (
          "—"
        )}
      </p>
    </header>
  );
}
