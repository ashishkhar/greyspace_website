"use client";

import { useRouter } from "next/navigation";

export default function AdminLogoutButton() {
  const router = useRouter();

  async function onLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button onClick={onLogout} className="rounded border border-zinc-700 px-3 py-1 text-sm hover:bg-zinc-900">
      Logout
    </button>
  );
}

