import Link from "next/link";
import { getBoards } from "@/lib/localStore";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminBoardsPage() {
  const boards = await getBoards();
  const sorted = [...boards].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const byProject = new Map<string, typeof sorted>();
  for (const board of sorted) {
    const key = board.projectName?.trim() || "General Project";
    const list = byProject.get(key) ?? [];
    list.push(board);
    byProject.set(key, list);
  }

  const projectKeys = Array.from(byProject.keys()).sort((a, b) => a.localeCompare(b));

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold text-gold-400">All Boards</h1>
        <Link href="/admin" className="text-sm text-zinc-400 hover:text-gold-400">
          ← Dashboard
        </Link>
      </div>
      <p className="text-zinc-400">Pick a board to edit project, name, code, or images.</p>

      {projectKeys.length === 0 ? (
        <p className="text-zinc-500">No boards yet. Create one first.</p>
      ) : (
        <div className="mt-6 space-y-8">
          {projectKeys.map((project) => (
            <section key={project} className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
              <h2 className="text-lg font-semibold text-gold-400">{project}</h2>
              <ul className="mt-3 divide-y divide-zinc-800">
                {(byProject.get(project) ?? []).map((board) => (
                  <li key={board.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-medium text-zinc-100">{board.name}</p>
                      <p className="text-sm text-zinc-500">
                        Code: <span className="text-zinc-300">{board.code}</span> · {board.images.length} image
                        {board.images.length === 1 ? "" : "s"}
                      </p>
                    </div>
                    <Link
                      href={`/admin/edit-board/${encodeURIComponent(board.code)}`}
                      className="rounded-md border border-zinc-600 px-3 py-1.5 text-sm hover:border-gold-500/60 hover:text-gold-400"
                    >
                      Edit
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
