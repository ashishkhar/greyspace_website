import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { normalizeImagesToBoardFolder } from "@/lib/boardUploads";
import { getBoards, getFeedback, saveBoards, saveFeedback } from "@/lib/localStore";
import { BoardImage } from "@/lib/types";

function dedupeImages(images: BoardImage[]): BoardImage[] {
  const seen = new Set<string>();
  return images.filter((img) => {
    const key = (img.url || "").trim() || img.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;
    const boards = await getBoards();
    const board = boards.find((item) => item.code.toUpperCase() === code.toUpperCase());

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    return NextResponse.json({ board });
  } catch {
    return NextResponse.json({ error: "Failed to load board" }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const { code: urlCode } = await params;
    const boards = await getBoards();
    const index = boards.findIndex((item) => item.code.toUpperCase() === urlCode.toUpperCase());

    if (index === -1) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const body = (await req.json()) as {
      projectName?: string;
      name?: string;
      code?: string;
      images?: BoardImage[];
    };

    const current = boards[index];

    const projectName = body.projectName?.trim() || current.projectName?.trim() || "General Project";
    const name = body.name?.trim();
    if (!name) {
      return NextResponse.json({ error: "Board name is required" }, { status: 400 });
    }

    if (!Array.isArray(body.images) || body.images.length === 0) {
      return NextResponse.json({ error: "Select at least one image" }, { status: 400 });
    }

    const uniqueImages = dedupeImages(body.images as BoardImage[]);
    if (uniqueImages.length === 0) {
      return NextResponse.json({ error: "Select at least one image" }, { status: 400 });
    }

    const newCode = (body.code?.trim() || current.code).toUpperCase();
    const oldCode = current.code;

    if (newCode !== oldCode) {
      const taken = boards.some((b, i) => i !== index && b.code.toUpperCase() === newCode);
      if (taken) {
        return NextResponse.json({ error: "That board code is already in use" }, { status: 400 });
      }
    }

    if (newCode !== oldCode) {
      const feedback = await getFeedback();
      const migrated = feedback.map((entry) =>
        entry.boardCode === oldCode ? { ...entry, boardCode: newCode } : entry,
      );
      await saveFeedback(migrated);
    }

    const imagesOnBoard = await normalizeImagesToBoardFolder(uniqueImages, newCode);

    boards[index] = {
      ...current,
      projectName,
      name,
      code: newCode,
      images: imagesOnBoard,
    };

    await saveBoards(boards);

    return NextResponse.json({ board: boards[index] });
  } catch {
    return NextResponse.json({ error: "Failed to update board" }, { status: 500 });
  }
}
