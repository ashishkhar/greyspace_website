"use client";

import type { BoardImage } from "@/lib/types";

type Props = {
  image: BoardImage | undefined;
  onPrev: () => void;
  onNext: () => void;
  touchStartX: number | null;
  setTouchStartX: (v: number | null) => void;
};

export default function PresentationImageStage({
  image,
  onPrev,
  onNext,
  touchStartX,
  setTouchStartX,
}: Props) {
  if (!image) {
    return (
      <section className="relative flex min-h-[40vh] items-center justify-center overflow-hidden rounded-lg border border-zinc-800 bg-black">
        <p className="text-zinc-500">No image</p>
      </section>
    );
  }

  return (
    <section
      className="relative overflow-hidden rounded-lg border border-zinc-800 bg-black"
      onTouchStart={(e) => setTouchStartX(e.changedTouches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStartX === null) return;
        const diff = touchStartX - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 50) {
          if (diff > 0) onNext();
          else onPrev();
        }
        setTouchStartX(null);
      }}
    >
      <img
        src={image.url}
        alt={image.title || "Board image"}
        className="h-[56vh] w-full object-contain transition-opacity duration-300"
      />

      <button
        type="button"
        onClick={onPrev}
        className="absolute left-2 top-1/2 -translate-y-1/2 rounded bg-black/60 px-3 py-2 text-sm hover:bg-black"
      >
        Prev
      </button>
      <button
        type="button"
        onClick={onNext}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-black/60 px-3 py-2 text-sm hover:bg-black"
      >
        Next
      </button>
    </section>
  );
}
