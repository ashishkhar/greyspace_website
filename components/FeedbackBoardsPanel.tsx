"use client";

import { useState } from "react";

export type FeedbackBoardRowVM = {
  imageId: string;
  url: string;
  title: string;
  likes: number;
  comments: string[];
};

export type FeedbackBoardVM = {
  boardId: string;
  boardName: string;
  code: string;
  clientSubmit: { at: string; comment: string } | null;
  rows: FeedbackBoardRowVM[];
};

export type FeedbackProjectVM = {
  projectName: string;
  boards: FeedbackBoardVM[];
};

type Props = {
  projects: FeedbackProjectVM[];
};

export default function FeedbackBoardsPanel({ projects }: Props) {
  const [preview, setPreview] = useState<{ url: string; title: string } | null>(null);

  return (
    <>
      <div className="mt-6 space-y-4">
        {projects.map((project) => (
          <section key={project.projectName} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <h2 className="text-2xl font-semibold text-gold-400">{project.projectName}</h2>

            <div className="mt-4 space-y-3">
              {project.boards.map((board) => (
                <details
                  key={board.boardId}
                  className="group rounded border border-zinc-800 bg-black open:border-zinc-700"
                >
                  <summary className="cursor-pointer list-none px-4 py-3 font-medium text-zinc-200 transition hover:bg-zinc-900/80 [&::-webkit-details-marker]:hidden">
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        {board.boardName}
                        <span className="ml-2 text-sm font-normal text-zinc-500">({board.code})</span>
                      </span>
                      <span className="text-xs text-zinc-600">
                        {board.rows.length} image{board.rows.length === 1 ? "" : "s"}
                      </span>
                    </span>
                  </summary>

                  <div className="border-t border-zinc-800 px-4 pb-4 pt-2">
                    <p className="text-xs text-zinc-500">Code: {board.code}</p>

                    {board.clientSubmit ? (
                      <div className="mt-3 rounded border border-gold-500/25 bg-gold-500/5 px-3 py-2 text-sm text-gold-200/90">
                        <span className="font-medium text-gold-400">Client submitted</span>
                        {" · "}
                        {new Date(board.clientSubmit.at).toLocaleString()}
                        {board.clientSubmit.comment?.trim() ? (
                          <p className="mt-1 text-zinc-400">Note: {board.clientSubmit.comment}</p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-3 grid gap-3">
                      {board.rows.map((row) => (
                        <div key={row.imageId} className="rounded border border-zinc-800 p-3">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="flex min-w-0 items-start gap-3">
                              <button
                                type="button"
                                onClick={() => setPreview({ url: row.url, title: row.title })}
                                className="group/thumb shrink-0 overflow-hidden rounded border border-zinc-700 transition hover:border-gold-500/40"
                                title="View full image"
                              >
                                <img
                                  src={row.url}
                                  alt={row.title || "Board image"}
                                  className="h-14 w-14 object-cover transition group-hover/thumb:opacity-90"
                                />
                              </button>
                              <div className="min-w-0">
                                <h4 className="font-medium">{row.title || "Untitled image"}</h4>
                                <button
                                  type="button"
                                  onClick={() => setPreview({ url: row.url, title: row.title })}
                                  className="mt-1 text-xs text-gold-500/90 underline-offset-2 hover:underline"
                                >
                                  Preview full image
                                </button>
                              </div>
                            </div>
                            <p className="shrink-0 text-sm text-zinc-300">❤️ {row.likes}</p>
                          </div>
                          {row.comments.length > 0 ? (
                            <ul className="mt-2 space-y-1 text-sm text-zinc-400">
                              {row.comments.map((comment, idx) => (
                                <li key={`${row.imageId}-${idx}`}>- {comment}</li>
                              ))}
                            </ul>
                          ) : (
                            <p className="mt-2 text-sm text-zinc-500">No comments yet.</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}

        {projects.length === 0 ? <p className="text-zinc-400">No feedback submitted yet.</p> : null}
      </div>

      {preview ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/92 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Full image preview"
          onClick={() => setPreview(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 hover:bg-zinc-900"
            onClick={() => setPreview(null)}
          >
            Close
          </button>
          <img
            src={preview.url}
            alt={preview.title || "Preview"}
            className="max-h-[min(90vh,900px)] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
