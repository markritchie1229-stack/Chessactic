import { notFound, redirect } from "next/navigation";

import { canCreateThread } from "../../_lib/permissions";
import { createThread } from "../../_lib/server-actions";
import {
  getClubBySlug,
  getCurrentMember,
  getThreads,
} from "../../_lib/server-queries";
import { ClubThreadComposer } from "./_components/ClubThreadComposer";
import type { ClubPageParams } from "../../_lib/types";

type PageProps = {
  params: ClubPageParams;
};

export default async function ClubForumPage({ params }: PageProps) {
  const { slug } = await params;

  const club = await getClubBySlug(slug);
  if (!club) {
    notFound();
  }

  const resolvedClub = club as NonNullable<typeof club>;
  const forumBase = `/social/clubs/${encodeURIComponent(slug)}/forum`;

  const threads = await getThreads(resolvedClub.id);
  const currentMember = await getCurrentMember(resolvedClub.id);

  const canPostThread = currentMember ? canCreateThread(currentMember) : false;

  async function createThreadAction(formData: FormData) {
    "use server";

    const title = String(formData.get("title") ?? "").trim();
    const body = String(formData.get("body") ?? "").trim();
    const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;

    const created = await createThread(
      resolvedClub.id,
      title,
      body,
      imageUrl,
    );

    redirect(`${forumBase}/${encodeURIComponent(created.id)}`);
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

        <ClubThreadComposer
          clubId={resolvedClub.id}
          canPost={canPostThread}
          action={createThreadAction}
        />
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Recent threads</h2>
          <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
            {threads.length} total
          </span>
        </div>

        <div className="space-y-2">
          {threads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
              No threads yet.
            </div>
          ) : (
            threads.map((thread) => (
              <a
                key={thread.id}
                href={`${forumBase}/${encodeURIComponent(thread.id)}`}
                className="block rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-slate-100 transition hover:border-cyan-500 hover:bg-slate-900"
              >
                {thread.title}
              </a>
            ))
          )}
        </div>
      </section>
    </div>
  );
}