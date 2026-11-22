import Link from "next/link";
import InquiryDelete from "@/components/admin/InquiryDelete";
import { getInquiries } from "@/lib/inquiries";

export const dynamic = "force-dynamic";

export default async function InquiriesPage() {
  const items = await getInquiries();
  return (
    <main className="min-h-screen bg-ink-950 text-white">
      <div className="mx-auto w-full max-w-4xl px-5 py-12 sm:px-8">
        <Link href="/admin" className="text-sm text-white/45 hover:text-white">
          ← Admin
        </Link>
        <h1 className="mt-4 text-3xl font-light tracking-tight">Inquiries</h1>
        <p className="mt-2 text-sm text-white/45">Messages from the contact form on the homepage, newest first.</p>

        {items.length === 0 ? (
          <p className="mt-12 rounded-2xl border border-white/[0.08] p-8 text-white/50">No inquiries yet.</p>
        ) : (
          <ul className="mt-10 space-y-4">
            {items.map((q) => (
              <li key={q.id} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-light">{q.name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      {q.phone ? (
                        <a href={`tel:${q.phone.replace(/\s+/g, "")}`} className="text-sand-300 hover:underline">
                          {q.phone}
                        </a>
                      ) : null}
                      {q.email ? (
                        <a href={`mailto:${q.email}`} className="text-sand-300 hover:underline">
                          {q.email}
                        </a>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <time className="text-xs text-white/40">
                      {new Date(q.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </time>
                    <InquiryDelete id={q.id} />
                  </div>
                </div>
                {q.message ? <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-white/70">{q.message}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
