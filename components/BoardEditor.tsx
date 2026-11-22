"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BoardPresentationPreview from "@/components/BoardPresentationPreview";
import UploadManager from "@/components/UploadManager";
import { Board, BoardImage } from "@/lib/types";

type Props = {
  boardCode: string;
};

export default function BoardEditor({ boardCode }: Props) {
  const router = useRouter();
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [images, setImages] = useState<BoardImage[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);

  const selectedImages = useMemo(() => images.filter((img) => selected[img.id]), [images, selected]);
  const uploadFolder = useMemo(() => (code.trim() || boardCode).trim() || boardCode, [code, boardCode]);

  useEffect(() => {
    let active = true;
    fetch("/api/projects")
      .then((res) => res.json())
      .then((data) => {
        if (active) {
          setProjectOptions(Array.isArray(data.projects) ? data.projects : []);
        }
      })
      .catch(() => {
        if (active) setProjectOptions([]);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadError("");
    setLoaded(false);
    fetch(`/api/board/${encodeURIComponent(boardCode)}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Board not found");
        }
        return data.board as Board;
      })
      .then((board) => {
        if (!active || !board) return;
        setProjectName(board.projectName?.trim() || "");
        setName(board.name || "");
        setCode(board.code || "");
        setImages(board.images || []);
        const sel: Record<string, boolean> = {};
        for (const img of board.images || []) {
          sel[img.id] = true;
        }
        setSelected(sel);
        setLoaded(true);
      })
      .catch((err: Error) => {
        if (active) {
          setLoadError(err.message || "Failed to load board");
          setLoaded(true);
        }
      });
    return () => {
      active = false;
    };
  }, [boardCode]);

  useEffect(() => {
    setSelected((prev) => {
      const next = { ...prev };
      const ids = new Set(images.map((i) => i.id));
      for (const img of images) {
        if (next[img.id] === undefined) {
          next[img.id] = false;
        }
      }
      for (const key of Object.keys(next)) {
        if (!ids.has(key)) {
          delete next[key];
        }
      }
      return next;
    });
  }, [images]);

  async function saveBoard() {
    if (!projectName.trim()) {
      setError("Project name is required.");
      return;
    }
    if (!name.trim()) {
      setError("Board name is required.");
      return;
    }
    if (selectedImages.length === 0) {
      setError("Please select at least one image.");
      return;
    }

    setLoading(true);
    setError("");
    setStatus("");

    try {
      const res = await fetch(`/api/board/${encodeURIComponent(boardCode)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: projectName.trim(),
          name: name.trim(),
          code: code.trim().toUpperCase(),
          images: selectedImages,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save");
        return;
      }

      const newCode = data.board?.code as string | undefined;
      setStatus("Board saved.");
      if (newCode && newCode.toUpperCase() !== boardCode.toUpperCase()) {
        router.replace(`/admin/edit-board/${encodeURIComponent(newCode)}`);
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (!loaded) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <p className="text-zinc-400">Loading board...</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8">
        <p className="text-red-400">{loadError}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <h1 className="text-3xl font-semibold text-gold-400">Edit Board</h1>

      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className="rounded-md border border-zinc-800 bg-black px-3 py-2"
            placeholder="Project name (umbrella)"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            list="project-name-options-edit"
          />
          <datalist id="project-name-options-edit">
            {projectOptions.map((project) => (
              <option key={project} value={project} />
            ))}
          </datalist>
          <input
            className="rounded-md border border-zinc-800 bg-black px-3 py-2"
            placeholder="Board name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="rounded-md border border-zinc-800 bg-black px-3 py-2"
            placeholder="Board code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </div>
      </section>

      <UploadManager items={images} onChange={setImages} uploadFolder={uploadFolder} />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          className="rounded-md border border-gold-500/40 bg-gold-500/10 px-4 py-2 text-sm font-medium text-gold-400 transition hover:bg-gold-500/15"
        >
          Review in presentation mode
        </button>
        <p className="self-center text-xs text-zinc-500">
          Same layout and Greyspaces header as your client sees—order follows the numbered tiles
          above.
        </p>
      </div>

      {previewOpen ? (
        <BoardPresentationPreview
          boardName={name.trim() || "Untitled board"}
          images={selectedImages}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}

      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-gold-400">Images on this board</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setSelected((prev) => {
                  const next = { ...prev };
                  for (const img of images) {
                    next[img.id] = true;
                  }
                  return next;
                })
              }
              className="rounded border border-zinc-600 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() =>
                setSelected((prev) => {
                  const next = { ...prev };
                  for (const img of images) {
                    next[img.id] = false;
                  }
                  return next;
                })
              }
              className="rounded border border-zinc-600 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-900"
            >
              Clear selection
            </button>
          </div>
        </div>
        <p className="mb-3 text-xs text-zinc-500">
          Check the images that should appear on the client board. New uploads start unchecked—select
          the ones you want before saving.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((img) => (
            <label key={img.id} className="cursor-pointer overflow-hidden rounded border border-zinc-800 bg-black">
              <img src={img.url} alt={img.title || "Board image"} className="h-36 w-full object-cover" />
              <div className="flex items-center gap-2 p-2">
                <input
                  type="checkbox"
                  checked={Boolean(selected[img.id])}
                  onChange={(e) => setSelected((prev) => ({ ...prev, [img.id]: e.target.checked }))}
                />
                <span className="text-sm">{img.title?.trim() || "Untitled image"}</span>
              </div>
            </label>
          ))}
        </div>

        <button
          type="button"
          onClick={() => void saveBoard()}
          disabled={loading}
          className="mt-4 rounded-md bg-gold-500 px-4 py-2 font-medium text-black hover:bg-gold-400 disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save changes"}
        </button>
        {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
        {status ? <p className="mt-2 text-sm text-zinc-400">{status}</p> : null}
      </section>
    </main>
  );
}
