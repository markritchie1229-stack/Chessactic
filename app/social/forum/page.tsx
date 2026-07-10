"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { isAdmin } from "@/lib/admin";
import { supabase } from "@/lib/supabase";
import { createForumThread, replyToForumThread } from "../_lib/social.server";

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
  image_url: string | null;
  created_at: string;
  updated_at: string | null;
};

type ForumProfile = {
  id: string;
  username: string | null;
};

type FeedItem = {
  kind: "thread" | "comment";
  id: string;
  threadId: string;
  title?: string | null;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string | null;
  image_url: string | null;
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

async function uploadForumImage(scope: string, file: File) {
  const extension = file.name.split(".").pop() || "bin";
  const path = `forum/${scope}/${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from("club-media").upload(path, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from("club-media").getPublicUrl(path);
  return data.publicUrl;
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
  const [threadImageUrl, setThreadImageUrl] = useState("");
  const [threadImageName, setThreadImageName] = useState("");
  const [threadImagePreviewUrl, setThreadImagePreviewUrl] = useState("");
  const [threadImageUploading, setThreadImageUploading] = useState(false);

  const [replyBody, setReplyBody] = useState("");
  const [replyImageUrl, setReplyImageUrl] = useState("");
  const [replyImageName, setReplyImageName] = useState("");
  const [replyImagePreviewUrl, setReplyImagePreviewUrl] = useState("");
  const [replyImageUploading, setReplyImageUploading] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [posting, setPosting] = useState(false);
  const [replying, setReplying] = useState(false);
  const [message, setMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isSiteAdmin, setIsSiteAdmin] = useState(false);
  const [profileNamesById, setProfileNamesById] = useState<Record<string, string>>({});

  const threadFileInputRef = useRef<HTMLInputElement | null>(null);
  const replyFileInputRef = useRef<HTMLInputElement | null>(null);

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
      .select("id,thread_id,author_id,body,image_url,created_at,updated_at", {
        count: "exact",
      })
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
      const userId = data.user?.id ?? null;
      setCurrentUserId(userId);
      setIsSiteAdmin(Boolean(userId && isAdmin(userId)));
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

  useEffect(() => {
    return () => {
      if (threadImagePreviewUrl) URL.revokeObjectURL(threadImagePreviewUrl);
      if (replyImagePreviewUrl) URL.revokeObjectURL(replyImagePreviewUrl);
    };
  }, [threadImagePreviewUrl, replyImagePreviewUrl]);

  const clearThreadImage = () => {
    if (threadImagePreviewUrl) URL.revokeObjectURL(threadImagePreviewUrl);
    setThreadImageUrl("");
    setThreadImageName("");
    setThreadImagePreviewUrl("");
    if (threadFileInputRef.current) threadFileInputRef.current.value = "";
  };

  const clearReplyImage = () => {
    if (replyImagePreviewUrl) URL.revokeObjectURL(replyImagePreviewUrl);
    setReplyImageUrl("");
    setReplyImageName("");
    setReplyImagePreviewUrl("");
    if (replyFileInputRef.current) replyFileInputRef.current.value = "";
  };

  const handleThreadImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setThreadImageUploading(true);
    setMessage("");

    try {
      if (threadImagePreviewUrl) URL.revokeObjectURL(threadImagePreviewUrl);
      const url = await uploadForumImage("thread-drafts", file);
      setThreadImageUrl(url);
      setThreadImageName(file.name);
      setThreadImagePreviewUrl(URL.createObjectURL(file));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setThreadImageUploading(false);
    }
  };

  const handleReplyImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setReplyImageUploading(true);
    setMessage("");

    try {
      if (replyImagePreviewUrl) URL.revokeObjectURL(replyImagePreviewUrl);
      const scope = selectedThreadId ? `reply-${selectedThreadId}` : "reply-drafts";
      const url = await uploadForumImage(scope, file);
      setReplyImageUrl(url);
      setReplyImageName(file.name);
      setReplyImagePreviewUrl(URL.createObjectURL(file));
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setReplyImageUploading(false);
    }
  };

  const createThread = async () => {
    const cleanTitle = title.trim();
    const cleanBody = body.trim();

    if (!cleanTitle || (!cleanBody && !threadImageUrl)) {
      setMessage("Title and either body or image are required.");
      return;
    }

    setPosting(true);
    setMessage("");

    try {
      const result = await createForumThread({
        title: cleanTitle,
        body: cleanBody,
        imageUrl: threadImageUrl || null,
      });

      setTitle("");
      setBody("");
      clearThreadImage();
      await loadThreads();
      setView("thread");
      await loadThreadPage(result.threadId, 1);
      setMessage("Thread posted.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not create thread.");
    } finally {
      setPosting(false);
    }
  };

  const replyToThread = async () => {
    if (!selectedThreadId) {
      setMessage("Open a thread first.");
      return;
    }

    const cleanReply = replyBody.trim();
    if (!cleanReply && !replyImageUrl) {
      setMessage("Write a reply or add an image first.");
      return;
    }

    setReplying(true);
    setMessage("");

    try {
      await replyToForumThread({
        threadId: selectedThreadId,
        body: cleanReply,
        imageUrl: replyImageUrl || null,
      });

      setReplyBody("");
      clearReplyImage();
      await refreshSelectedThread();
      setMessage("Reply posted.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not reply.");
    } finally {
      setReplying(false);
    }
  };

  const goToThreadPage = async (page: number) => {
    if (!selectedThreadId) return;
    const target = Math.max(1, Math.min(page, threadPageCount));
    await loadThreadPage(selectedThreadId, target);
  };

  const postStart = (threadPage - 1) * POSTS_PER_PAGE + 1;
  const postEnd = Math.min(threadPage * POSTS_PER_PAGE, threadPostCount);

  const renderImageAttachment = (imageUrl: string | null, alt: string) => {
    if (!imageUrl) return null;
    return (
      <img
        src={imageUrl}
        alt={alt}
        className="mt-3 max-h-96 w-full rounded-2xl border border-slate-800 object-cover"
      />
    );
  };

  const feedItems: FeedItem[] = useMemo(() => {
    if (!selectedThread || posts.length === 0) return [];

    const firstPost = posts[0];

    return [
      {
        kind: "thread",
        id: firstPost.id,
        threadId: selectedThread.id,
        title: selectedThread.title,
        author_id: selectedThread.author_id,
        body: firstPost.body,
        created_at: firstPost.created_at,
        updated_at: firstPost.updated_at,
        image_url: firstPost.image_url,
      },
      ...posts.slice(1).map((post) => ({
        kind: "comment" as const,
        id: post.id,
        threadId: post.thread_id,
        author_id: post.author_id,
        body: post.body,
        created_at: post.created_at,
        updated_at: post.updated_at,
        image_url: post.image_url,
      })),
    ];
  }, [posts, selectedThread]);

  const handleDeleteThread = async (threadId: string) => {
    const ok = window.confirm("Delete this thread?");
    if (!ok) return;

    try {
      const { error: postsError } = await supabase.from("forum_posts").delete().eq("thread_id", threadId);
      if (postsError) throw new Error(postsError.message);

      const { error } = await supabase.from("forum_threads").delete().eq("id", threadId);
      if (error) throw new Error(error.message);

      setMessage("Thread deleted.");
      setView("list");
      setSelectedThreadId(null);
      setSelectedThread(null);
      await loadThreads();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not delete thread.");
    }
  };

  const handleDeletePost = async (post: FeedItem) => {
    const ok = window.confirm("Delete this comment?");
    if (!ok) return;

    try {
      if (post.kind === "thread") {
        await handleDeleteThread(post.threadId);
        return;
      }

      const { error } = await supabase.from("forum_posts").delete().eq("id", post.id);
      if (error) throw new Error(error.message);

      const { count: remainingCount } = await supabase
        .from("forum_posts")
        .select("id", { count: "exact", head: true })
        .eq("thread_id", post.threadId);

      const { data: latestPost, error: latestError } = await supabase
        .from("forum_posts")
        .select("created_at")
        .eq("thread_id", post.threadId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError) throw new Error(latestError.message);

      const { error: threadUpdateError } = await supabase
        .from("forum_threads")
        .update({
          reply_count: Math.max((remainingCount ?? 0) - 1, 0),
          last_post_at: latestPost?.created_at ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.threadId);

      if (threadUpdateError) throw new Error(threadUpdateError.message);

      setMessage("Comment deleted.");
      await refreshSelectedThread();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not delete comment.");
    }
  };

  const handleEditThreadTitle = async (thread: ForumThread) => {
    const nextTitle = window.prompt("Edit thread title", thread.title);
    if (nextTitle === null) return;

    const cleanTitle = nextTitle.trim();
    if (!cleanTitle) {
      setMessage("Thread title cannot be empty.");
      return;
    }

    try {
      const { error } = await supabase
        .from("forum_threads")
        .update({
          title: cleanTitle,
          updated_at: new Date().toISOString(),
        })
        .eq("id", thread.id);

      if (error) throw new Error(error.message);

      setMessage("Thread updated.");
      setThreads((current) =>
        current.map((row) => (row.id === thread.id ? { ...row, title: cleanTitle } : row)),
      );
      setSelectedThread((current) =>
        current && current.id === thread.id ? { ...current, title: cleanTitle } : current,
      );
      await refreshSelectedThread();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not edit thread.");
    }
  };

  const handleEditPost = async (post: FeedItem) => {
    const nextBody = window.prompt("Edit post body", post.body ?? "");
    if (nextBody === null) return;

    const nextImage = window.prompt(
      "Edit image URL (leave blank to remove)",
      post.image_url ?? "",
    );
    if (nextImage === null) return;

    const cleanBody = nextBody.trim();
    const cleanImage = nextImage.trim();

    if (!cleanBody && !cleanImage) {
      setMessage("Post body or image is required.");
      return;
    }

    try {
      const { error } = await supabase
        .from("forum_posts")
        .update({
          body: cleanBody,
          image_url: cleanImage || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", post.id);

      if (error) throw new Error(error.message);

      setMessage("Post updated.");
      await refreshSelectedThread();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not edit post.");
    }
  };

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

            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-700 bg-slate-950">
              <div className="flex items-center gap-2 border-b border-slate-800 px-3 py-2">
                <button
                  type="button"
                  onClick={() => threadFileInputRef.current?.click()}
                  disabled={threadImageUploading}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 transition hover:border-cyan-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  title="Add image"
                >
                  <ImagePlus className="h-4 w-4" />
                </button>

                <div className="min-w-0 flex-1 text-xs text-slate-400">
                  {threadImageUploading
                    ? "Uploading image..."
                    : threadImageName
                      ? `Attached: ${threadImageName}`
                      : "Add a picture"}
                </div>

                {threadImageUrl ? (
                  <button
                    type="button"
                    onClick={clearThreadImage}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-rose-500 hover:text-rose-200"
                    title="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                ) : null}

                <input
                  ref={threadFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleThreadImageChange}
                />
              </div>

              {threadImagePreviewUrl ? (
                <div className="border-b border-slate-800 bg-slate-950/80 p-3">
                  <img
                    src={threadImagePreviewUrl}
                    alt="Selected thread upload"
                    className="max-h-72 w-full rounded-xl object-cover"
                  />
                </div>
              ) : null}

              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write the first post..."
                rows={10}
                className="w-full rounded-none border-0 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:ring-0"
              />
            </div>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void createThread()}
                disabled={posting || threadImageUploading}
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
                    <div
                      key={thread.id}
                      className={`relative rounded-2xl border p-4 pr-14 transition ${
                        active
                          ? "border-slate-200 bg-slate-100 text-slate-950"
                          : "border-slate-800 bg-slate-950/60 text-slate-100 hover:bg-slate-800"
                      }`}
                    >
                      {isSiteAdmin ? (
                        <div className="absolute right-3 top-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => void handleEditThreadTitle(thread)}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border text-sm transition ${
                              active
                                ? "border-slate-300 bg-slate-200 text-slate-700"
                                : "border-slate-700 bg-slate-900 text-slate-300 hover:border-cyan-500 hover:text-cyan-300"
                            }`}
                            title="Edit thread title"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteThread(thread.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-rose-500 hover:text-rose-300"
                            title="Delete thread"
                          >
                            ×
                          </button>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => void openThread(thread.id)}
                        className="block w-full text-left"
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
                    </div>
                  );
                })
              )}
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                <div className="text-sm uppercase tracking-wide text-slate-500">Thread</div>
                <div className="mt-2 text-xl font-semibold">{selectedThreadTitle}</div>

                {selectedThread ? (
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                    <span>
                      Started {formatDate(selectedThread.created_at)} · {threadPostCount} posts · by{" "}
                      {displayNameFor(selectedThread.author_id)}
                    </span>

                    {isSiteAdmin ? (
                      <div className="ml-auto flex gap-2">
                        <button
                          type="button"
                          onClick={() => void handleEditThreadTitle(selectedThread)}
                          className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-cyan-500 hover:text-cyan-300"
                        >
                          Edit title
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteThread(selectedThread.id)}
                          className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs font-medium text-slate-200 transition hover:border-rose-500 hover:text-rose-300"
                        >
                          Delete thread
                        </button>
                      </div>
                    ) : null}
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
                        {feedItems.length === 0 ? (
                          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4 text-sm text-slate-400">
                            No posts in this thread yet.
                          </div>
                        ) : (
                          feedItems.map((item, index) => {
                            const authorName = displayNameFor(item.author_id);
                            const isYou = currentUserId === item.author_id;
                            const isOriginalPost = item.kind === "thread";

                            return (
                              <div
                                key={item.id}
                                className={`relative rounded-2xl border p-4 pr-14 ${
                                  index === 0
                                    ? "border-slate-700 bg-slate-900/80"
                                    : "border-slate-800 bg-slate-950/70"
                                }`}
                              >
                                {isSiteAdmin ? (
                                  <div className="absolute right-3 top-3 flex gap-2">
                                    <button
                                      type="button"
                                      onClick={() => void handleEditPost(item)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-cyan-500 hover:text-cyan-300"
                                      title="Edit"
                                    >
                                      ✎
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void handleDeletePost(item)}
                                      className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-rose-500 hover:text-rose-300"
                                      title="Delete"
                                    >
                                      ×
                                    </button>
                                  </div>
                                ) : null}

                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                                    <span>{authorName}</span>
                                    {isYou ? (
                                      <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                                        You
                                      </span>
                                    ) : null}
                                    {isOriginalPost ? (
                                      <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-cyan-200">
                                        Original post
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="text-xs text-slate-500">{formatDate(item.created_at)}</div>
                                </div>

                                {renderImageAttachment(
                                  item.image_url,
                                  isOriginalPost ? "Thread attachment" : "Post attachment",
                                )}

                                <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-100">
                                  {item.body}
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
                        <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
                          <button
                            type="button"
                            onClick={() => replyFileInputRef.current?.click()}
                            disabled={replyImageUploading}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-200 transition hover:border-cyan-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                            title="Add image"
                          >
                            <ImagePlus className="h-4 w-4" />
                          </button>

                          <div className="min-w-0 flex-1 text-xs text-slate-400">
                            {replyImageUploading
                              ? "Uploading image..."
                              : replyImageName
                                ? `Attached: ${replyImageName}`
                                : "Add a picture"}
                          </div>

                          {replyImageUrl ? (
                            <button
                              type="button"
                              onClick={clearReplyImage}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-rose-500 hover:text-rose-200"
                              title="Remove image"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          ) : null}

                          <input
                            ref={replyFileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleReplyImageChange}
                          />
                        </div>

                        {replyImagePreviewUrl ? (
                          <div className="border-b border-slate-800 bg-slate-950/80 p-3">
                            <img
                              src={replyImagePreviewUrl}
                              alt="Selected reply upload"
                              className="max-h-72 w-full rounded-xl object-cover"
                            />
                          </div>
                        ) : null}

                        <div className="pt-3 text-sm uppercase tracking-wide text-slate-500">
                          Comment
                        </div>
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
                          disabled={replying || replyImageUploading}
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