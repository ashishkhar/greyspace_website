import { NextResponse } from "next/server";
import { CLIENT_SUBMIT_IMAGE_ID } from "@/lib/feedbackConstants";
import { getFeedback, saveFeedback } from "@/lib/localStore";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const boardCode = url.searchParams.get("boardCode")?.trim();
    if (!boardCode) {
      return NextResponse.json({ error: "boardCode required" }, { status: 400 });
    }

    const feedback = await getFeedback();
    const entries = feedback.filter(
      (e) => e.boardCode.toUpperCase() === boardCode.toUpperCase(),
    );
    return NextResponse.json({ entries });
  } catch {
    return NextResponse.json({ error: "Failed to load feedback" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      boardCode?: string;
      imageId?: string;
      reaction?: "like" | "none" | "submit";
      comment?: string;
    };

    if (!body.boardCode || !body.reaction) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const feedback = await getFeedback();
    const now = new Date().toISOString();

    if (body.reaction === "submit") {
      const imageId = body.imageId?.trim() || CLIENT_SUBMIT_IMAGE_ID;
      const existingIndex = feedback.findIndex(
        (entry) =>
          entry.boardCode === body.boardCode &&
          entry.imageId === imageId &&
          entry.reaction === "submit",
      );
      const nextEntry = {
        boardCode: body.boardCode!,
        imageId,
        reaction: "submit" as const,
        comment: body.comment?.trim() || "",
        createdAt: now,
        updatedAt: now,
      };
      if (existingIndex >= 0) {
        feedback[existingIndex] = {
          ...feedback[existingIndex],
          ...nextEntry,
          createdAt: feedback[existingIndex].createdAt || now,
        };
      } else {
        feedback.push({
          ...nextEntry,
          createdAt: now,
        });
      }
      await saveFeedback(feedback);
      return NextResponse.json({ ok: true });
    }

    if (!body.imageId) {
      return NextResponse.json({ error: "Missing imageId" }, { status: 400 });
    }

    if (body.reaction === "none") {
      const filtered = feedback.filter(
        (entry) =>
          !(entry.boardCode === body.boardCode && entry.imageId === body.imageId),
      );
      await saveFeedback(filtered);
      return NextResponse.json({ ok: true });
    }

    const existingIndex = feedback.findIndex(
      (entry) => entry.boardCode === body.boardCode && entry.imageId === body.imageId,
    );

    const nextEntry = {
      boardCode: body.boardCode,
      imageId: body.imageId,
      reaction: "like" as const,
      comment: body.comment?.trim() || "",
      createdAt: now,
      updatedAt: now,
    };

    if (existingIndex >= 0) {
      feedback[existingIndex] = {
        ...feedback[existingIndex],
        ...nextEntry,
        createdAt: feedback[existingIndex].createdAt || now,
      };
    } else {
      feedback.push(nextEntry);
    }

    await saveFeedback(feedback);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }
}
