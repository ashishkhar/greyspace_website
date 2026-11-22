import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/adminGuard";
import { normalizeImagesToBoardFolder } from "@/lib/boardUploads";
import { generateBoardCode, getBoards, saveBoards, uniqueId } from "@/lib/localStore";
import { BoardImage } from "@/lib/types";

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  try {
    const body = (await req.json()) as {
      projectName?: string;
      name?: string;
      images?: BoardImage[];
      code?: string;
    };

    if (!body.projectName?.trim()) {
      return NextResponse.json({ error: "Project name is required" }, { status: 400 });
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Board name is required" }, { status: 400 });
    }

    if (!Array.isArray(body.images) || body.images.length === 0) {
      return NextResponse.json({ error: "Select at least one image" }, { status: 400 });
    }

    const seenUrls = new Set<string>();
    const uniqueImages = body.images.filter((img) => {
      const key = (img.url || "").trim() || img.id;
      if (seenUrls.has(key)) return false;
      seenUrls.add(key);
      return true;
    });

    if (uniqueImages.length === 0) {
      return NextResponse.json({ error: "Select at least one image" }, { status: 400 });
    }

    const boards = await getBoards();
    const generatedCode = (body.code?.trim() || generateBoardCode(body.name)).toUpperCase();

    const imagesOnBoard = await normalizeImagesToBoardFolder(uniqueImages, generatedCode);

    const board = {
      id: uniqueId("board"),
      projectName: body.projectName.trim(),
      name: body.name.trim(),
      code: generatedCode,
      images: imagesOnBoard,
      createdAt: new Date().toISOString(),
    };

    boards.push(board);
    await saveBoards(boards);

    return NextResponse.json({ board });
  } catch {
    return NextResponse.json({ error: "Failed to create board" }, { status: 500 });
  }
}
