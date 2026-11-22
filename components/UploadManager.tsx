"use client";

import { useState } from "react";
import { BoardImage } from "@/lib/types";

type Props = {
  items: BoardImage[];
  onChange: (items: BoardImage[]) => void;
  /** Subfolder under /public/uploads (board code or session id). New files go here. */
  uploadFolder?: string;
};

function localId() {
  return `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function UploadManager({ items, onChange, uploadFolder = "GENERAL" }: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function onUpload(files: FileList) {
    setUploading(true);
    setError("");

    try {
      const uploaded: BoardImage[] = [];
      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", uploadFolder);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Upload failed");
        }

        uploaded.push({
          id: localId(),
          url: data.url,
          title: "",
          description: "",
        });
      }

      onChange([...items, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function updateItem(id: string, patch: Partial<BoardImage>) {
    onChange(items.map((img) => (img.id === id ? { ...img, ...patch } : img)));
  }

  function moveItem(index: number, delta: number) {
    const j = index + delta;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[index], next[j]] = [next[j], next[index]];
    onChange(next);
  }

  function removeItem(id: string) {
    if (!window.confirm("Remove this image from the board?")) return;
    onChange(items.filter((img) => img.id !== id));
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <h2 className="mb-3 text-lg font-semibold text-gold-400">Upload Images</h2>
      <input
        type="file"
        accept="image/*"
        multiple
        className="mt-3 w-full rounded-md border border-zinc-800 bg-black p-2 file:mr-3 file:rounded file:border-0 file:bg-gold-500 file:px-3 file:py-1 file:text-black"
        onChange={(e) => {
          const files = e.target.files;
          if (files?.length) {
            void onUpload(files);
          }
        }}
      />
      <p className="mt-2 text-xs text-zinc-500">
        You can upload multiple images now and add names/descriptions later. Use the arrows to set
        presentation order (top to first slide).
      </p>

      {uploading && <p className="mt-2 text-sm text-zinc-400">Uploading...</p>}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((img, index) => (
          <article key={img.id} className="overflow-hidden rounded border border-zinc-800 bg-black">
            <div className="relative">
              <img src={img.url} alt={img.title || "Uploaded image"} className="h-32 w-full object-cover" />
              <span className="absolute left-2 top-2 rounded bg-black/70 px-2 py-0.5 text-xs tabular-nums text-zinc-300">
                {index + 1}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 border-b border-zinc-800 p-2">
              <button
                type="button"
                title="Move earlier in presentation"
                onClick={() => moveItem(index, -1)}
                disabled={index === 0}
                className="rounded border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-900 disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                title="Move later in presentation"
                onClick={() => moveItem(index, 1)}
                disabled={index >= items.length - 1}
                className="rounded border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-900 disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                title="Remove image"
                onClick={() => removeItem(img.id)}
                className="ml-auto rounded border border-red-900/60 px-2 py-1 text-xs text-red-400 hover:bg-red-950/40"
              >
                Remove
              </button>
            </div>
            <div className="p-2">
              <input
                className="w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm"
                placeholder="Image name (optional)"
                value={img.title}
                onChange={(e) => updateItem(img.id, { title: e.target.value })}
              />
              <textarea
                className="mt-2 w-full rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs"
                rows={2}
                placeholder="Description (optional)"
                value={img.description || ""}
                onChange={(e) => updateItem(img.id, { description: e.target.value })}
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
