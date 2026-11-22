"use client";

import { useEffect, useMemo, useState } from "react";
import UploadManager from "@/components/UploadManager";
import { BoardImage } from "@/lib/types";

function buildCode(name: string) {
  const letters = name
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim()
    .split(/\s+/)
    .map((x) => x.slice(0, 2).toUpperCase())
    .join("")
    .slice(0, 6);
  const number = String(Math.floor(Math.random() * 1000)).padStart(3, "0");
  return `${letters || "BOARD"}-${number}`;
}

export default function BoardCreator() {
  const [projectName, setProjectName] = useState("");
  const [projectOptions, setProjectOptions] = useState<string[]>([]);
  const [name, setName] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [images, setImages] = useState<BoardImage[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [resultCode, setResultCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [uploadSession] = useState(
    () => `NEW-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  );

  const selectedImages = useMemo(() => images.filter((img) => selected[img.id]), [images, selected]);
  /** Uploads go under public/uploads/{folder}/ until create-board normalizes to final code. */
  const uploadFolder = useMemo(
    () => (customCode.trim() ? customCode.trim() : uploadSession),
    [customCode, uploadSession],
  );

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
        if (active) {
          setProjectOptions([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  async function createBoard() {
    if (!projectName.trim()) {
      setError("Project name is required.");
      return;
    }
    if (!name.trim()) {
      setError("Board name is required.");
      return;
    }
    if (selectedImages.length === 0) {
      setError("Please select at least one uploaded image.");
      return;
    }

    setLoading(true);
    setError("");

    const code = customCode.trim() || buildCode(name);

    try {
      const res = await fetch("/api/create-board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          name,
          code,
          images: selectedImages,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create board");
        return;
      }

      setResultCode(data.board.code);
      setCopyStatus("");
    } finally {
      setLoading(false);
    }
  }

  async function copyBoardCode() {
    if (!resultCode) return;

    try {
      if (typeof window !== "undefined" && window.isSecureContext && navigator.clipboard) {
        await navigator.clipboard.writeText(resultCode);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = resultCode;
        textArea.style.position = "fixed";
        textArea.style.opacity = "0";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textArea);
        if (!ok) {
          throw new Error("Copy failed");
        }
      }
      setCopyStatus("Code copied.");
    } catch {
      setCopyStatus("Copy failed. Please copy manually.");
    }
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8">
      <h1 className="text-3xl font-semibold text-gold-400">Create Board</h1>

      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            className="rounded-md border border-zinc-800 bg-black px-3 py-2"
            placeholder="Project name (umbrella)"
            value={projectName}
            onChange={(e) => setProjectName(e.target.value)}
            list="project-name-options"
          />
          <datalist id="project-name-options">
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
            placeholder="Custom code (optional)"
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
          />
        </div>
      </section>

      <UploadManager items={images} onChange={setImages} uploadFolder={uploadFolder} />

      <section className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <h2 className="mb-3 text-lg font-semibold text-gold-400">Select Images</h2>
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
          onClick={createBoard}
          disabled={loading}
          className="mt-4 rounded-md bg-gold-500 px-4 py-2 font-medium text-black hover:bg-gold-400 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Board"}
        </button>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

        {resultCode && (
          <div className="mt-4 rounded border border-gold-500/40 bg-black p-3">
            <p className="text-sm text-zinc-300">Board code</p>
            <div className="mt-1 flex items-center gap-2">
              <strong className="text-xl text-gold-400">{resultCode}</strong>
              <button
                onClick={() => void copyBoardCode()}
                className="rounded border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-900"
              >
                Copy code
              </button>
            </div>
            {copyStatus ? <p className="mt-2 text-xs text-zinc-400">{copyStatus}</p> : null}
          </div>
        )}
      </section>
    </main>
  );
}
