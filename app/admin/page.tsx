import Link from "next/link";
import AdminLogoutButton from "@/components/AdminLogoutButton";
import { getInquiries } from "@/lib/inquiries";
import { getBoards, getFeedback } from "@/lib/localStore";

export const dynamic = "force-dynamic";

function Card({ href, title, body, meta }: { href: string; title: string; body: string; meta?: string }) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6 transition hover:border-white/20 hover:bg-white/[0.04]"
    >
      <div>
        <h3 className="text-[15px] font-medium text-white">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-white/50">{body}</p>
      </div>
      <div className="mt-6 flex items-center justify-between text-xs text-white/40">
        <span>{meta}</span>
        <span className="transition group-hover:translate-x-0.5 group-hover:text-white">→</span>
      </div>
    </Link>
  );
}

export default async function AdminPage() {
  const [boards, feedback, inquiries] = await Promise.all([getBoards(), getFeedback(), getInquiries()]);
  const latest = inquiries[0];

  return (
    <main className="min-h-screen bg-ink-950 text-white">
      <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-white/40">Grey Spaces</p>
            <h1 className="mt-2 text-3xl font-light tracking-tight">Admin</h1>
          </div>
          <AdminLogoutButton />
        </div>

        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs uppercase tracking-[0.3em] text-sand-400">Website</h2>
            <Link href="/" target="_blank" className="text-xs text-white/40 hover:text-white">
              View site ↗
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card href="/admin/site" title="Edit homepage" body="Text, images, projects, services and contact details on the 3D homepage." meta="Content" />
            <Card
              href="/admin/inquiries"
              title="Inquiries"
              body={latest ? `Latest from ${latest.name}` : "Messages sent through the contact form."}
              meta={`${inquiries.length} received`}
            />
            <Card href="/admin/site#moodboard" title="Moodboard page text" body="Headlines and intro on the /moodboard landing page." meta="Content" />
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-baseline justify-between">
            <h2 className="text-xs uppercase tracking-[0.3em] text-sand-400">Moodboard</h2>
            <Link href="/moodboard" target="_blank" className="text-xs text-white/40 hover:text-white">
              View moodboard ↗
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card href="/admin/create-board" title="Create board" body="Upload images and publish a board code for a client." meta="New" />
            <Card href="/admin/boards" title="Edit boards" body="Change project, title, code or images." meta={`${boards.length} boards`} />
            <Card href="/admin/feedback" title="Feedback" body="See likes and comments by board." meta={`${feedback.length} entries`} />
          </div>
        </section>
      </div>
    </main>
  );
}
