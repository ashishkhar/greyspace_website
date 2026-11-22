"use client";

import { useEffect, useState } from "react";
import type { BoardImage } from "@/lib/types";
import GreyspacesPresentationHeader from "@/components/GreyspacesPresentationHeader";
import PresentationImageStage from "@/components/PresentationImageStage";

type Props = {
  boardName: string;
  images: BoardImage[];
  onClose: () => void;
};

/**
 * Same presentation chrome as the client board view, for admin review while editing.
 */
export default function BoardPresentationPreview({ boardName, images, onClose }: Props) {
  const [idx, setIdx] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    if (images.length === 0) return;
    if (idx >= images.length) setIdx(0);
  }, [images.length, idx]);

  const image = images[idx];

  function goNext() {
    if (images.length === 0) return;
    setIdx((prev) => (prev + 1) % images.length);
  }

  function goPrev() {
    if (images.length === 0) return;
    setIdx((prev) => (prev - 1 + images.length) % images.length);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-b from-charcoal-950 via-charcoal-950 to-charcoal-900">
      <div className="flex items-center justify-end gap-3 border-b border-zinc-800/80 px-4 py-3">
        <p className="mr-auto text-xs uppercase tracking-[0.2em] text-zinc-500">Presentation preview</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
        >
          Close
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col overflow-y-auto px-4 pb-8 pt-2">
        <GreyspacesPresentationHeader
          boardName={boardName}
          currentIndex={idx}
          total={images.length}
        />

        {images.length === 0 ? (
          <p className="mt-8 text-center text-zinc-500">No images selected for this board.</p>
        ) : (
          <>
            <PresentationImageStage
              image={image}
              onPrev={goPrev}
              onNext={goNext}
              touchStartX={touchStartX}
              setTouchStartX={setTouchStartX}
            />
            <section className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h2 className="text-lg font-semibold">{image?.title?.trim() || "Untitled image"}</h2>
              {image?.description ? (
                <p className="mt-1 text-sm text-zinc-400">{image.description}</p>
              ) : null}
              <p className="mt-3 text-xs text-zinc-600">
                This is a preview only—likes and comments are not saved here.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
