import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { canCreateThread } from "../../_lib/permissions";
import { createThread } from "../../_lib/server-actions";
import {
  getClubBySlug,
  getClubMembers,
  getCurrentMember,
  getProfiles,
  getThreads,
  requireClubBySlug,
} from "../../_lib/server-queries";
import type { ClubPageParams } from "../../_lib/types";

type PageProps = {
  params: ClubPageParams;
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

export default async function ClubForumPage({ params }: PageProps) {
  const { slug } = await params;

  const club = await requireClubBySlug(slug);

  const [threads, members, currentMember] = await Promise.all([
    getThreads(club.id),
    getClubMembers(club.id),
    getCurrentMember(club.id),
  ]);

  const profiles = await getProfiles(members.map((member) => member.user_id));
  const base = `/social/clubs/${club.title_search}`;
  const canPostThread = currentMember ? canCreateThread(currentMember) : false;

  async function createThreadAction(formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();

    const created = await createThread(club.id, title, body);
    redirect(`${base}/forum/${created.id}`);
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <h2 className="text-xl font-semibold">Forum</h2>
        <p className="mt-2 text-sm text-slate-400">
          Create club threads for others to interact with.
        </p>

        {currentMember ? null : (
          <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            You are not a member of this club.
          </div>
        )}

        <form action={createThreadAction} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-100">
              Thread title
            </label>
            <input
              name="title"
              disabled={!canPostThread}
              placeholder={
                canPostThread
                  ? "Your idea here..."
                  : "Join the club to post"
              }
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-100">
              Thread body
            </label>
            <textarea
              name="body"
              rows={5}
              disabled={!canPostThread}
              placeholder="Explain the topic..."
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={!canPostThread}
            className="rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Post thread
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Recent threads</h2>
          <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
            {threads.length} total
          </span>
        </div>

        <div className="space-y-3">
          {threads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-sm text-slate-400">
              No threads yet.
            </div>
          ) : (
            threads.map((thread) => {
              const author = thread.author_id
                ? profiles.get(thread.author_id)
                : undefined;

              return (
                <Link
                  key={thread.id}
                  href={`${base}/forum/${thread.id}`}
                  className="block rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-500/40 hover:bg-slate-950"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="truncate text-lg font-medium text-slate-100">
                        {thread.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-400">
                        by {author?.username ?? thread.author_id ?? "Member"} ·{" "}
                        {formatDate(thread.created_at)}
                      </p>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-300">
                        {thread.body}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200">
                      Open →
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}