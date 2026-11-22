import Link from "next/link";
import BoardEditor from "@/components/BoardEditor";

export default async function EditBoardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return (
    <div>
      <div className="mx-auto w-full max-w-6xl px-4 pt-6">
        <Link href="/admin/boards" className="text-sm text-gold-400 hover:underline">
          ← Back to boards
        </Link>
      </div>
      <BoardEditor boardCode={code} />
    </div>
  );
}
