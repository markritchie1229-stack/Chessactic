"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ForumThread = {
  id: string;
  author_id: string;
  title: string;
  created_at: string;
  updated_at: string | null;
  last_post_at: string | null;
  reply_count: number;
  is_pinned: boolean;
};

type ForumPost = {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string | null;
};

type ForumProfile = {
  id: string;
  username: string | null;
};

const POSTS_PER_PAGE = 20;

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function SocialForumPage() {
  const [view, setView] = useState<"list" | "compose" | "thread">("list");

  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [selectedThread, setSelectedThread] = useState<ForumThread | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [threadPage, setThreadPage] = useState(1);
  const [threadPostCount, setThreadPostCount] = useState(0);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [replyBody, setReplyBody] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [posting, setPosting] = useState(false);
  const [replying, setReplying] = useState(false);
  const [message, setMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profileNamesById, setProfileNamesById] = useState<Record<string, string>>({});

  const selectedThreadTitle = useMemo(() => {
    return selectedThread?.title ?? "Open a thread";
  }, [selectedThread]);

  const threadPageCount = useMemo(() => {
    return Math.max(1, Math.ceil(threadPostCount / POSTS_PER_PAGE));
  }, [threadPostCount]);

  const displayNameFor = (authorId: string) => profileNamesById[authorId] ?? "User";

  const mergeProfiles = (profiles: ForumProfile[]) => {
    if (profiles.length === 0) return;
    setProfileNamesById((current) => {
      const next = { ...current };
      for (const profile of profiles) {
        next[profile.id] = profile.username?.trim() || "User";
      }
      return next;
    });
  };

  const loadProfilesForIds = async (ids: string[]) => {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (uniqueIds.length === 0) return;

    const missingIds = uniqueIds.filter((id) => !profileNamesById[id]);
    if (missingIds.length === 0) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", missingIds);

    if (error || !data) return;
    mergeProfiles(data as ForumProfile[]);
  };

  const loadThreads = async () => {
    const { data, error } = await supabase
      .from("forum_threads")
      .select("id,author_id,title,created_at,updated_at,last_post_at,reply_count,is_pinned")
      .order("is_pinned", { ascending: false })
      .order("last_post_at", { ascending: false });

    if (error) {
      setMessage(error.message || "Could not load threads.");
      return;
    }

    const nextThreads = (data as ForumThread[] | null) ?? [];
    setThreads(nextThreads);
    void loadProfilesForIds(nextThreads.map((thread) => thread.author_id));
  };

  const loadThreadPage = async (threadId: string, page: number) => {
    setLoadingThread(true);
    setMessage("");

    const thread = threads.find((item) => item.id === threadId) ?? selectedThread ?? null;
    const from = Math.max(0, (page - 1) * POSTS_PER_PAGE);
    const to = from + POSTS_PER_PAGE - 1;

    const { data, error, count } = await supabase
      .from("forum_posts")
      .select("id,thread_id,author_id,body,created_at,updated_at", { count: "exact" })
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true })
      .range(from, to);

    if (error) {
      setMessage(error.message || "Could not load thread.");
      setPosts([]);
      setSelectedThread(null);
      setSelectedThreadId(null);
      setLoadingThread(false);
      return;
    }

    const nextPosts = (data as ForumPost[] | null) ?? [];
    setPosts(nextPosts);
    setThreadPostCount(count ?? 0);
    setSelectedThread(thread);
    setSelectedThreadId(threadId);
    setThreadPage(page);

    const authorIds = [
      ...(thread ? [thread.author_id] : []),
      ...nextPosts.map((post) => post.author_id),
    ];
    void loadProfilesForIds(authorIds);

    setLoadingThread(false);
  };

  const openThread = async (threadId: string) => {
    setView("thread");
    await loadThreadPage(threadId, 1);
  };

  const refreshSelectedThread = async () => {
    if (!selectedThreadId) return;
    await Promise.all([loadThreads(), loadThreadPage(selectedThreadId, threadPage)]);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data.user?.id ?? null);
      await loadThreads();
      setLoading(false);
    };

    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedThreadId) {
      setSelectedThread(null);
      setPosts([]);
      setThreadPostCount(0);
      setThreadPage(1);
    }
  }, [selectedThreadId]);

  const createThread = async () => {
    const cleanTitle = title.trim();
    const cleanBody = body.trim();

    if (!cleanTitle || !cleanBody) {
      setMessage("Title and body are required.");
      return;
    }

    setPosting(true);
    setMessage("");

    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (!session) {
      setMessage("Sign in to post.");
      setPosting(false);
      return;
    }

    const { data: threadRow, error: threadError } = await supabase
      .from("forum_threads")
      .insert({
        author_id: session.user.id,
        title: cleanTitle,
      })
      .select("id")
      .single();

    if (threadError || !threadRow) {
      setMessage(threadError?.message || "Could not create thread.");
      setPosting(false);
      return;
    }

    const { error: postError } = await supabase.from("forum_posts").insert({
      thread_id: threadRow.id,
      author_id: session.user.id,
      body: cleanBody,
    });

    if (postError) {
      setMessage(postError.message);
      setPosting(false);
      return;
    }

    setTitle("");
    setBody("");
    await loadThreads();
    setView("thread");
    await loadThreadPage(threadRow.id, 1);
    setMessage("Thread posted.");
    setPosting(false);
  };

  const replyToThread = async () => {
    if (!selectedThreadId) {
      setMessage("Open a thread first.");
      return;
    }

    const cleanReply = replyBody.trim();
    if (!cleanReply) {
      setMessage("Write a reply first.");
      return;
    }

    setReplying(true);
    setMessage("");

    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (!session) {
      setMessage("Sign in to comment.");
      setReplying(false);
      return;
    }

    const { error } = await supabase.from("forum_posts").insert({
      thread_id: selectedThreadId,
      author_id: session.user.id,
      body: cleanReply,
    });

    if (error) {
      setMessage(error.message);
      setReplying(false);
      return;
    }

    setReplyBody("");
    await refreshSelectedThread();
    setMessage("Reply posted.");
    setReplying(false);
  };

  const goToThreadPage = async (page: number) => {
    if (!selectedThreadId) return;
    const target = Math.max(1, Math.min(page, threadPageCount));
    await loadThreadPage(selectedThreadId, target);
  };

  const postStart = (threadPage - 1) * POSTS_PER_PAGE + 1;
  const postEnd = Math.min(threadPage * POSTS_PER_PAGE, threadPostCount);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm uppercase tracking-wide text-slate-400">Social</div>
        <h1 className="mt-2 text-3xl font-semibold">Forum</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          One public board for the whole site.
        </p>
      </div>

      {view === "compose" ? (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm uppercase tracking-wide text-slate-400">New thread</div>
              <div className="mt-1 text-2xl font-semibold">Create a thread</div>
            </div>
            <button
              type="button"
              onClick={() => setView("list")}
              className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
            >
              Back
            </button>
          </div>

          <div className="max-w-2xl rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Thread title"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
            />

            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write the first post..."
              rows={10}
              className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
            />

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void createThread()}
                disabled={posting}
                className="rounded-2xl bg-slate-100 px-4 py-3 font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {posting ? "Posting..." : "Post thread"}
              </button>
              <button
                type="button"
                onClick={() => setView("list")}
                className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 font-medium text-slate-100 transition hover:bg-slate-800"
              >
                Cancel
              </button>
            </div>

            {message ? (
              <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
                {message}
              </div>
            ) : null}
          </div>
        </section>
      ) : (
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <div className="text-sm uppercase tracking-wide text-slate-400">Threads</div>
              <div className="mt-1 text-xl font-semibold">Already posted threads</div>
            </div>

            <button
              type="button"
              onClick={() => {
                setMessage("");
                setView("compose");
              }}
              className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-white"
            >
              New thread
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_420px]">
            <div className="space-y-3">
              {loading ? (
                <div className="text-sm text-slate-400">Loading topics...</div>
              ) : threads.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                  No threads yet. Start the first one.
                </div>
              ) : (
                threads.map((thread) => {
                  const active = thread.id === selectedThreadId;
                  const authorName = displayNameFor(thread.author_id);

                  return (
                    <button
                      key={thread.id}
                      type="button"
                      onClick={() => void openThread(thread.id)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        active
                          ? "border-slate-200 bg-slate-100 text-slate-950"
                          : "border-slate-800 bg-slate-950/60 text-slate-100 hover:bg-slate-800"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-medium">{thread.title}</div>
                          <div className={`mt-1 text-sm ${active ? "text-slate-700" : "text-slate-500"}`}>
                            by {authorName} · Replies: {thread.reply_count} · Last activity{" "}
                            {formatDate(thread.last_post_at ?? thread.updated_at ?? thread.created_at)}
                          </div>
                        </div>
                        {thread.is_pinned ? (
                          <div
                            className={`rounded-full border px-3 py-1 text-xs ${
                              active
                                ? "border-slate-300 bg-slate-200 text-slate-700"
                                : "border-slate-700 bg-slate-900 text-slate-200"
                            }`}
                          >
                            Pinned
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-sm uppercase tracking-wide text-slate-500">Thread</div>
                <div className="mt-2 text-xl font-semibold">{selectedThreadTitle}</div>
                {selectedThread ? (
                  <div className="mt-2 text-sm text-slate-400">
                    Started {formatDate(selectedThread.created_at)} · {threadPostCount} posts · by{" "}
                    {displayNameFor(selectedThread.author_id)}
                  </div>
                ) : (
                  <div className="mt-2 text-sm text-slate-500">
                    Select a thread to read it and comment on it.
                  </div>
                )}
              </div>

              {selectedThread ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  {loadingThread ? (
                    <div className="text-sm text-slate-400">Loading thread...</div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
                        <div>
                          Showing {postStart}-{postEnd} of {threadPostCount}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void goToThreadPage(threadPage - 1)}
                            disabled={threadPage <= 1}
                            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Prev
                          </button>
                          <div className="text-xs text-slate-500">
                            Page {threadPage} / {threadPageCount}
                          </div>
                          <button
                            type="button"
                            onClick={() => void goToThreadPage(threadPage + 1)}
                            disabled={threadPage >= threadPageCount}
                            className="rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Next
                          </button>
                        </div>
                      </div>

                      <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                        {posts.length === 0 ? (
                          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
                            No posts in this thread yet.
                          </div>
                        ) : (
                          posts.map((post, index) => {
                            const authorName = displayNameFor(post.author_id);
                            const isYou = currentUserId === post.author_id;

                            return (
                              <div
                                key={post.id}
                                className={`rounded-2xl border p-4 ${
                                  index === 0
                                    ? "border-slate-700 bg-slate-900/80"
                                    : "border-slate-800 bg-slate-950/70"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                                    <span>{authorName}</span>
                                    {isYou ? (
                                      <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                                        You
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="text-xs text-slate-500">{formatDate(post.created_at)}</div>
                                </div>
                                <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-100">
                                  {post.body}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => void goToThreadPage(threadPage - 1)}
                          disabled={threadPage <= 1}
                          className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Previous page
                        </button>
                        <button
                          type="button"
                          onClick={() => void goToThreadPage(threadPage + 1)}
                          disabled={threadPage >= threadPageCount}
                          className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Next page
                        </button>
                      </div>

                      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                        <div className="text-sm uppercase tracking-wide text-slate-500">Comment</div>
                        <textarea
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
                          placeholder="Write a reply..."
                          rows={5}
                          className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
                        />
                        <button
                          type="button"
                          onClick={() => void replyToThread()}
                          disabled={replying}
                          className="mt-3 w-full rounded-2xl bg-slate-100 px-4 py-3 font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {replying ? "Posting..." : "Post comment"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                  Open a thread to read the posts and add a comment.
                </div>
              )}
            </div>
          </div>

          {message ? (
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
              {message}
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
