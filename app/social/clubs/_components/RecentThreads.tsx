import Link from "next/link";

import type { ClubThread } from "../_lib/types";

type Props = {
  threads: ClubThread[];
  base: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function RecentThreads({ threads, base }: Props) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Recent threads</h2>
          <p className="mt-2 text-sm text-slate-400">
            The latest club forum topics.
          </p>
        </div>

        <Link
          href={`${base}/forum`}
          className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-500 hover:bg-slate-900"
        >
          View all
        </Link>
      </div>

      <div className="space-y-3">
        {threads.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
            No threads yet.
          </div>
        ) : (
          threads.map((thread) => (
            <article
              key={thread.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-medium text-slate-100">
                    {thread.title}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(thread.created_at)}
                  </p>
                </div>

                <Link
                  href={`${base}/forum`}
                  className="text-sm text-cyan-300 transition hover:text-cyan-200"
                >
                  Open
                </Link>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}