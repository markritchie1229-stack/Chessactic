"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SocialPageShell } from "../_components/SocialPageShell";

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
  const [threads, setThreads] = useState<ForumThread[]>([]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState("");

  const loadThreads = async () => {
    const { data, error } = await supabase
      .from("forum_threads")
      .select("id,author_id,title,created_at,updated_at,last_post_at,reply_count,is_pinned")
      .order("is_pinned", { ascending: false })
      .order("last_post_at", { ascending: false });

    if (!error) {
      setThreads((data as ForumThread[] | null) ?? []);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadThreads();
      setLoading(false);
    };

    void load();
  }, []);

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
    } else {
      setTitle("");
      setBody("");
      await loadThreads();
      setMessage("Thread posted.");
    }

    setPosting(false);
  };

  return (
    <SocialPageShell title="Forum" subtitle="One public board for the whole site.">
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3">
          {loading ? (
            <div className="text-sm text-slate-400">Loading topics...</div>
          ) : threads.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
              No threads yet. Start the first one.
            </div>
          ) : (
            threads.map((thread) => (
              <div
                key={thread.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-slate-100">{thread.title}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      Replies: {thread.reply_count} · Last activity{" "}
                      {formatDate(thread.last_post_at ?? thread.updated_at ?? thread.created_at)}
                    </div>
                  </div>
                  {thread.is_pinned ? (
                    <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200">
                      Pinned
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-sm uppercase tracking-wide text-slate-500">New thread</div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Thread title"
            className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
          />

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write the first post..."
            rows={8}
            className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
          />

          <button
            type="button"
            onClick={() => void createThread()}
            disabled={posting}
            className="mt-3 w-full rounded-2xl bg-slate-100 px-4 py-3 font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {posting ? "Posting..." : "Post thread"}
          </button>

          {message ? (
            <div className="mt-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-300">
              {message}
            </div>
          ) : null}
        </div>
      </div>
    </SocialPageShell>
  );
}