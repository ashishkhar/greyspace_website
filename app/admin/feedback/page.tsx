import { CLIENT_SUBMIT_IMAGE_ID } from "@/lib/feedbackConstants";
import FeedbackBoardsPanel, {
  type FeedbackProjectVM,
} from "@/components/FeedbackBoardsPanel";
import { getBoards, getFeedback } from "@/lib/localStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminFeedbackPage() {
  const [boards, feedback] = await Promise.all([getBoards(), getFeedback()]);
  const boardsWithFeedback = boards.filter((board) => feedback.some((entry) => entry.boardCode === board.code));
  const projectNames = Array.from(
    new Set(boardsWithFeedback.map((board) => board.projectName?.trim() || "General Project")),
  ).sort((a, b) => a.localeCompare(b));

  const projects: FeedbackProjectVM[] = projectNames.map((projectName) => {
    const projectBoards = boardsWithFeedback.filter(
      (board) => (board.projectName?.trim() || "General Project") === projectName,
    );

    const boardsVm = projectBoards.map((board) => {
      const boardFeedback = feedback.filter((item) => item.boardCode === board.code);
      const clientSubmit = boardFeedback
        .filter(
          (item) => item.reaction === "submit" && item.imageId === CLIENT_SUBMIT_IMAGE_ID,
        )
        .sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime(),
        )[0];

      const rows = board.images.map((image) => {
        const imageFeedback = boardFeedback.filter((item) => item.imageId === image.id);
        const likes = imageFeedback.filter(
          (item) => item.reaction === "like" || item.reaction === "up",
        ).length;
        const comments = imageFeedback.map((item) => item.comment).filter(Boolean) as string[];

        return {
          imageId: image.id,
          url: image.url,
          title: image.title || "",
          likes,
          comments,
        };
      });

      return {
        boardId: board.id,
        boardName: board.name,
        code: board.code,
        clientSubmit: clientSubmit
          ? {
              at: clientSubmit.updatedAt || clientSubmit.createdAt,
              comment: clientSubmit.comment?.trim() || "",
            }
          : null,
        rows,
      };
    });

    return { projectName, boards: boardsVm };
  });

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-8">
      <h1 className="text-3xl font-semibold text-gold-400">Feedback Viewer</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Organized by project. Expand a board by name to see images and comments. Click a thumbnail or
        &quot;Preview full image&quot; for the full-size view.
      </p>

      <FeedbackBoardsPanel projects={projects} />
    </main>
  );
}
