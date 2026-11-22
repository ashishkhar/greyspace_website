import BoardViewer from "@/components/BoardViewer";

export default async function BoardPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return <BoardViewer code={code} />;
}
