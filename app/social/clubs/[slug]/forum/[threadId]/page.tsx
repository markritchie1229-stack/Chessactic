import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ClubCommentComposer } from "../_components/ClubCommentComposer";
import { canComment } from "../../../_lib/permissions";
import { postComment } from "../../../_lib/server-actions";
import {
  getClubBySlug,
  getCurrentMember,
  getProfiles,
  getThreadById,
  getThreadComments,
} from "../../../_lib/server-queries";

type ThreadPageParams = Promise<{
  slug: string;
  threadId: string;
}>;

type PageProps = {
  params: ThreadPageParams;
  searchParams?: {
    page?: string;
  };
};

type CommentWithImage = {
  id: string;
  author_id: string | null;
  body: string;
  created_at: string | null;
  image_url?: string | null;
};

type FeedItem = {
  kind: "thread" | "comment";
  id: string;
  author_id: string | null;
  body: string;
  created_at: string | null;
  image_url: string | null;
};

const PAGE_SIZE = 20;

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
  searchParams,
}: PageProps) {
  const { slug, threadId } = await params;
  const resolvedSearchParams = await searchParams;

  const club = await getClubBySlug(slug);
  if (!club) {
    notFound();
  }

  const resolvedClub = club as NonNullable<typeof club>;

  const threadResult = await getThreadById(threadId);
  if (!threadResult || threadResult.club_id !== resolvedClub.id) {
    notFound();
  }

  const thread = threadResult;
  const threadImageUrl =
    (thread as { image_url?: string | null }).image_url ?? null;

  const [comments, currentMember] = await Promise.all([
    getThreadComments(thread.id),
    getCurrentMember(resolvedClub.id),
  ]);

  const typedComments = comments as CommentWithImage[];

  const feedItems: FeedItem[] = [
    {
      kind: "thread",
      id: `thread-${thread.id}`,
      author_id: thread.author_id,
      body: thread.body,
      created_at: thread.created_at,
      image_url: threadImageUrl,
    },
    ...typedComments.map((comment) => ({
      kind: "comment" as const,
      id: comment.id,
      author_id: comment.author_id,
      body: comment.body,
      created_at: comment.created_at,
      image_url: comment.image_url ?? null,
    })),
  ];

  const totalItems = feedItems.length;
  const pageCount = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  const requestedPage = Number.parseInt(resolvedSearchParams?.page ?? "1", 10);
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const safePage = Math.min(currentPage, pageCount);

  const start = (safePage - 1) * PAGE_SIZE;
  const end = start + PAGE_SIZE;
  const visibleItems = feedItems.slice(start, end);

  const profiles = await getProfiles([
    ...(thread.author_id ? [thread.author_id] : []),
    ...comments
      .map((comment) => comment.author_id)
      .filter((id): id is string => Boolean(id)),
  ]);

  const base = `/social/clubs/${resolvedClub.title_search}`;

  function pageHref(page: number) {
    const clamped = Math.min(Math.max(page, 1), pageCount);
    const params = new URLSearchParams();

    if (clamped > 1) {
      params.set("page", String(clamped));
    }

    const query = params.toString();
    return query
      ? `${base}/forum/${thread.id}?${query}`
      : `${base}/forum/${thread.id}`;
  }

  const redirectUrl =
    safePage > 1
      ? `${base}/forum/${thread.id}?page=${safePage}`
      : `${base}/forum/${thread.id}`;

  async function postCommentAction(formData: FormData) {
    "use server";

    const body = String(formData.get("body") ?? "").trim();
    const imageUrl = String(formData.get("imageUrl") ?? "").trim();

    await postComment(resolvedClub.id, body, thread.id, imageUrl || null);

    redirect(redirectUrl);
  }

  const canPost = Boolean(currentMember);
  const author = thread.author_id ? profiles.get(thread.author_id) : undefined;
  const showPagination = pageCount > 1;

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
          Posted by {author?.username ?? thread.author_id ?? "Member"} •{" "}
          {formatDate(thread.created_at)}
        </p>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Replies</h2>
            <p className="mt-1 text-sm text-slate-400">
              Showing {totalItems === 0 ? 0 : start + 1}-
              {Math.min(end, totalItems)} of {totalItems} posts.
            </p>
          </div>

          {showPagination ? (
            <div className="flex items-center gap-2">
              {safePage > 1 ? (
                <Link
                  href={pageHref(safePage - 1)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                >
                  Prev
                </Link>
              ) : (
                <span className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-500">
                  Prev
                </span>
              )}

              <span className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-300">
                Page {safePage} / {pageCount}
              </span>

              {safePage < pageCount ? (
                <Link
                  href={pageHref(safePage + 1)}
                  className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                >
                  Next
                </Link>
              ) : (
                <span className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-500">
                  Next
                </span>
              )}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          {visibleItems.map((item) => {
            const itemAuthor = item.author_id ? profiles.get(item.author_id) : undefined;
            const isOriginalPost = item.kind === "thread";

            return (
              <article
                key={item.id}
                className={`rounded-2xl border p-5 ${
                  isOriginalPost
                    ? "border-slate-700 bg-slate-900/80"
                    : "border-slate-800 bg-slate-950/60"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="font-medium">
                      {itemAuthor?.username ?? item.author_id ?? "Member"}
                    </div>

                    {isOriginalPost ? (
                      <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-200">
                        Original post
                      </span>
                    ) : null}
                  </div>

                  <div className="text-xs text-slate-500">
                    {formatDate(item.created_at)}
                  </div>
                </div>

                {item.image_url ? (
                  <img
                    src={item.image_url}
                    alt={isOriginalPost ? "Thread attachment" : "Comment attachment"}
                    className="mt-3 max-h-96 w-full rounded-2xl border border-slate-800 object-cover"
                  />
                ) : null}

                {item.body ? (
                  <p className="mt-3 whitespace-pre-wrap leading-6 text-slate-300">
                    {item.body}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>

        {showPagination ? (
          <div className="mt-6 flex items-center justify-between gap-2">
            {safePage > 1 ? (
              <Link
                href={pageHref(safePage - 1)}
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
              >
                Previous page
              </Link>
            ) : (
              <span className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-500">
                Previous page
              </span>
            )}

            {safePage < pageCount ? (
              <Link
                href={pageHref(safePage + 1)}
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
              >
                Next page
              </Link>
            ) : (
              <span className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-500">
                Next page
              </span>
            )}
          </div>
        ) : null}

        <div className="mt-6">
          <ClubCommentComposer
            clubId={resolvedClub.id}
            threadId={thread.id}
            canPost={canPost}
            action={postCommentAction}
          />
        </div>
      </section>
    </div>
  );
}