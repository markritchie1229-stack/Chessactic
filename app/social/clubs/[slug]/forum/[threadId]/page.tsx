import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { canComment } from "../../../_lib/permissions";
import { postComment } from "../../../_lib/server-actions";
import {
  getClubBySlug,
  getCurrentMember,
  getProfiles,
  getThreadById,
  getThreadComments,
  requireClubBySlug,
} from "../../../_lib/server-queries";

type ThreadPageParams = Promise<{
  slug: string;
  threadId: string;
}>;

type PageProps = {
  params: ThreadPageParams;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function ClubThreadPage({
  params,
}: PageProps) {
  const { slug, threadId } = await params;

  const club = await requireClubBySlug(slug);

  const threadResult = await getThreadById(threadId);

  if (!threadResult || threadResult.club_id !== club.id) {
    notFound();
  }

  const thread = threadResult;

  const [comments, currentMember] = await Promise.all([
    getThreadComments(thread.id),
    getCurrentMember(club.id),
  ]);

  const profiles = await getProfiles([
    ...(thread.author_id ? [thread.author_id] : []),
    ...comments
      .map((comment) => comment.author_id)
      .filter((id): id is string => Boolean(id)),
  ]);

  const base = `/social/clubs/${club.title_search}`;

  async function postCommentAction(formData: FormData) {
    "use server";

    const body = String(formData.get("body") ?? "").trim();

    await postComment(club.id, body, thread.id);

    redirect(`${base}/forum/${thread.id}`);
  }

  const canPost = currentMember ? canComment(currentMember) : false;

  const author = thread.author_id
    ? profiles.get(thread.author_id)
    : undefined;

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <Link
          href={`${base}/forum`}
          className="text-sm text-cyan-300 hover:text-cyan-200"
        >
          ← Back to Forum
        </Link>

        <h1 className="mt-4 text-3xl font-bold">{thread.title}</h1>

        <p className="mt-2 text-sm text-slate-400">
          Posted by{" "}
          {author?.username ?? thread.author_id ?? "Member"} •{" "}
          {formatDate(thread.created_at)}
        </p>

        <div className="mt-6 whitespace-pre-wrap rounded-2xl border border-slate-800 bg-slate-950/60 p-5 leading-7 text-slate-300">
          {thread.body}
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <h2 className="text-xl font-semibold">Replies</h2>

        <form action={postCommentAction} className="mt-5 space-y-3">
          <textarea
            name="body"
            rows={4}
            disabled={!canPost}
            placeholder={
              canPost
                ? "Write your reply..."
                : "You must be a club member to reply."
            }
            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
          />

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!canPost}
              className="rounded-2xl bg-cyan-500 px-5 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
            >
              Post Reply
            </button>
          </div>
        </form>

        <div className="mt-8 space-y-4">
          {comments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-5 text-sm text-slate-400">
              No replies yet.
            </div>
          ) : (
            comments.map((comment) => {
              const commentAuthor = comment.author_id
                ? profiles.get(comment.author_id)
                : undefined;

              return (
                <article
                  key={comment.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {commentAuthor?.username ?? comment.author_id ?? "Member"}
                    </div>

                    <div className="text-xs text-slate-500">
                      {formatDate(comment.created_at)}
                    </div>
                  </div>

                  <p className="mt-3 whitespace-pre-wrap leading-6 text-slate-300">
                    {comment.body}
                  </p>
                </article>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}