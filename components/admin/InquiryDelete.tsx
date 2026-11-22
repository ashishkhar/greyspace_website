"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function InquiryDelete({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        if (!window.confirm("Delete this inquiry? This cannot be undone.")) return;
        setBusy(true);
        await fetch(`/api/admin/inquiries?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        router.refresh();
      }}
      className="text-xs text-white/35 hover:text-red-300 disabled:opacity-40"
    >
      Delete
    </button>
  );
}
