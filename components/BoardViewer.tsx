"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CLIENT_SUBMIT_IMAGE_ID } from "@/lib/feedbackConstants";
import { Board } from "@/lib/types";
import GreyspacesPresentationHeader from "@/components/GreyspacesPresentationHeader";
import PresentationImageStage from "@/components/PresentationImageStage";

type Props = {
  code: string;
};

type ImageFeedback = {
  liked: boolean;
  comment: string;
};

function dedupeImages<T extends { id: string; url: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((img) => {
    const key = (img.url || "").trim() || img.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function BoardViewer({ code }: Props) {
  const [board, setBoard] = useState<Board | null>(null);
  const [idx, setIdx] = useState(0);
  const [feedbackByImageId, setFeedbackByImageId] = useState<Record<string, ImageFeedback>>({});
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [submitNote, setSubmitNote] = useState("");
  const [status, setStatus] = useState("");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const images = useMemo(() => (board ? dedupeImages(board.images) : []), [board]);

  useEffect(() => {
    let active = true;
    fetch(`/api/board/${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          setBoard(data.board || null);
        }
      })
      .catch(() => setBoard(null));

    return () => {
      active = false;
    };
  }, [code]);

  useEffect(() => {
    let active = true;
    fetch(`/api/feedback?boardCode=${encodeURIComponent(code)}`)
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        const map: Record<string, ImageFeedback> = {};
        let submitTime: string | null = null;
        let lastSubmitComment = "";
        for (const e of data.entries || []) {
          if (e.reaction === "submit" && e.imageId === CLIENT_SUBMIT_IMAGE_ID) {
            const t = e.updatedAt || e.createdAt;
            if (typeof t === "string" && (!submitTime || t > submitTime)) {
              submitTime = t;
              lastSubmitComment = typeof e.comment === "string" ? e.comment : "";
            }
            continue;
          }
          if (e.reaction === "like" || e.reaction === "up") {
            map[e.imageId] = {
              liked: true,
              comment: typeof e.comment === "string" ? e.comment : "",
            };
          }
        }
        setFeedbackByImageId(map);
        setSubmittedAt(submitTime);
        if (lastSubmitComment) setSubmitNote(lastSubmitComment);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [code]);

  useEffect(() => {
    if (images.length === 0) return;
    if (idx >= images.length) {
      setIdx(0);
    }
  }, [images.length, idx]);

  const image = images[idx];
  const row = image ? feedbackByImageId[image.id] : undefined;
  const liked = row?.liked ?? false;
  const comment = row?.comment ?? "";

  const setCommentForImage = useCallback((imageId: string, text: string) => {
    setFeedbackByImageId((prev) => ({
      ...prev,
      [imageId]: {
        liked: prev[imageId]?.liked ?? false,
        comment: text,
      },
    }));
  }, []);

  async function persistLike(imageId: string, nextComment: string) {
    if (!board) return false;
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardCode: board.code,
        imageId,
        reaction: "like",
        comment: nextComment,
      }),
    });
    if (!res.ok) {
      setStatus("Failed to save.");
      return false;
    }
    setStatus("Saved.");
    return true;
  }

  async function removeFeedback(imageId: string) {
    if (!board) return false;
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardCode: board.code,
        imageId,
        reaction: "none",
      }),
    });
    if (!res.ok) {
      setStatus("Failed to update.");
      return false;
    }
    setStatus("Removed like.");
    return true;
  }

  async function handleToggleLike() {
    if (!image) return;
    const imageId = image.id;
    setStatus("");

    if (liked) {
      const ok = await removeFeedback(imageId);
      if (!ok) return;
      setFeedbackByImageId((prev) => {
        const next = { ...prev };
        delete next[imageId];
        return next;
      });
      return;
    }

    setFeedbackByImageId((prev) => ({
      ...prev,
      [imageId]: { liked: true, comment: prev[imageId]?.comment ?? "" },
    }));
    await persistLike(imageId, comment);
  }

  async function handleSaveComment() {
    if (!image) return;
    setStatus("");
    if (!liked) {
      setStatus("Like first, then save comment.");
      return;
    }
    await persistLike(image.id, comment);
  }

  async function handleClientSubmit() {
    if (!board) return;
    setStatus("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          boardCode: board.code,
          imageId: CLIENT_SUBMIT_IMAGE_ID,
          reaction: "submit",
          comment: submitNote.trim(),
        }),
      });
      if (!res.ok) {
        setStatus("Could not submit. Try again.");
        return;
      }
      const now = new Date().toISOString();
      setSubmittedAt(now);
      setStatus("Thank you—your responses have been submitted.");
    } finally {
      setSubmitting(false);
    }
  }

  function goNext() {
    setIdx((prev) => (prev + 1) % images.length);
    setStatus("");
  }

  function goPrev() {
    setIdx((prev) => (prev - 1 + images.length) % images.length);
    setStatus("");
  }

  if (!board) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-charcoal-950 to-charcoal-900 px-4">
        <p className="text-zinc-400">Loading board...</p>
      </main>
    );
  }

  if (images.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-charcoal-950 to-charcoal-900 px-4">
        <p className="text-zinc-400">No images on this board.</p>
      </main>
    );
  }

  const submittedLabel = submittedAt
    ? new Date(submittedAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : null;

  return (
    <main className="min-h-screen bg-gradient-to-b from-charcoal-950 via-charcoal-950 to-charcoal-900">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 pb-10 pt-2">
        <GreyspacesPresentationHeader
          boardName={board.name}
          currentIndex={idx}
          total={images.length}
        />

        {submittedAt ? (
          <div className="rounded-lg border border-gold-500/30 bg-gold-500/5 px-4 py-3 text-sm text-gold-200/90">
            Your feedback was submitted{submittedLabel ? ` on ${submittedLabel}` : ""}. You can still
            browse and update likes or comments below.
          </div>
        ) : null}

        <PresentationImageStage
          image={image}
          onPrev={goPrev}
          onNext={goNext}
          touchStartX={touchStartX}
          setTouchStartX={setTouchStartX}
        />

        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <h2 className="text-lg font-semibold">{image.title?.trim() || "Untitled image"}</h2>
          {image.description ? <p className="mt-1 text-sm text-zinc-400">{image.description}</p> : null}

          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => void handleToggleLike()}
              className={`rounded border px-4 py-2 ${
                liked ? "border-gold-500 text-gold-400" : "border-zinc-700 hover:bg-zinc-900"
              }`}
            >
              {liked ? "❤️ Liked" : "🤍 Like"}
            </button>
          </div>

          <textarea
            className="mt-3 w-full rounded-md border border-zinc-800 bg-black px-3 py-2"
            rows={3}
            placeholder={liked ? "Optional comment (Enter or Save)" : "Like first, then add comment"}
            value={comment}
            onChange={(e) => setCommentForImage(image.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSaveComment();
              }
            }}
          />

          <button
            type="button"
            onClick={() => void handleSaveComment()}
            className="mt-2 rounded-md border border-zinc-600 px-4 py-2 text-sm hover:bg-zinc-900"
          >
            Save comment
          </button>

          {status ? <p className="mt-2 text-sm text-zinc-400">{status}</p> : null}
        </section>

        <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <h3 className="text-sm font-semibold uppercase tracking-[0.15em] text-zinc-500">
            Submit to your design team
          </h3>
          <p className="mt-2 text-sm text-zinc-500">
            When you are finished reviewing, submit so the team knows you have gone through the
            presentation.
          </p>
          <textarea
            className="mt-3 w-full rounded-md border border-zinc-800 bg-black px-3 py-2 text-sm"
            rows={2}
            placeholder="Optional note to the team (overall thoughts)"
            value={submitNote}
            onChange={(e) => setSubmitNote(e.target.value)}
            disabled={Boolean(submitting)}
          />
          <button
            type="button"
            onClick={() => void handleClientSubmit()}
            disabled={submitting}
            className="mt-3 w-full rounded-sm border border-gold-500/50 bg-gold-500/15 px-6 py-3.5 text-sm font-medium uppercase tracking-[0.18em] text-gold-400 transition hover:border-gold-400/70 hover:bg-gold-500/25 disabled:opacity-50 sm:w-auto"
          >
            {submitting ? "Submitting…" : submittedAt ? "Submit again (update)" : "Submit feedback"}
          </button>
        </section>
      </div>
    </main>
  );
}
