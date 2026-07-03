import Link from "next/link";
import type { ThreadRecord } from "../_lib/types";

type RecentThreadsProps = {
  threads: ThreadRecord[];
  base: string;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function RecentThreads({ threads, base }: RecentThreadsProps) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Recent threads</h2>
        <p className="mt-2 text-sm text-slate-400">
          The three most recently commented-on threads show below the chat.
        </p>
      </div>

      {threads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
          No threads yet.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-3">
          {threads.map((thread) => (
            <Link
              key={thread.id}
              href={`${base}/forum`}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-500/40 hover:bg-slate-950"
            >
              <div className="font-medium text-slate-100">{thread.title}</div>
              <div className="mt-2 text-sm leading-6 text-slate-400">
                Recently commented on by club members.
              </div>
              <div className="mt-3 text-xs text-slate-500">
                {formatDate(thread.created_at)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}