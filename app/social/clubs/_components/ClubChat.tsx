"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import type { CommentRecord } from "../_lib/types";

type ClubChatProps = {
  comments: CommentRecord[];
  canPost?: boolean;
  onPost?: (body: string) => Promise<void> | void;
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

export function ClubChat({ comments, canPost = true, onPost }: ClubChatProps) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const text = body.trim();
    if (!text || !canPost || submitting) return;

    try {
      setSubmitting(true);
      await onPost?.(text);
      setBody("");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <h2 className="text-xl font-semibold">Club chat</h2>
      <p className="mt-2 text-sm text-slate-400">
        Members can post messages here in real time.
      </p>

      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          placeholder={
            canPost ? "Type a club comment..." : "You are muted."
          }
          disabled={!canPost || submitting}
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canPost || submitting || !body.trim()}
            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Posting..." : "Post comment"}
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {comments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
            No comments yet.
          </div>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-slate-100">
                  {comment.author_id ?? "Member"}
                </div>
                <div className="text-xs text-slate-500">
                  {formatDate(comment.created_at)}
                </div>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {comment.body}
              </p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}