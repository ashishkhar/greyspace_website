import { NextResponse } from "next/server";
import { getBoards } from "@/lib/localStore";

export async function GET() {
  try {
    const boards = await getBoards();
    const projects = Array.from(
      new Set(
        boards
          .map((board) => board.projectName?.trim())
          .filter((name): name is string => Boolean(name)),
      ),
    ).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ projects });
  } catch {
    return NextResponse.json({ error: "Failed to load projects" }, { status: 500 });
  }
}

