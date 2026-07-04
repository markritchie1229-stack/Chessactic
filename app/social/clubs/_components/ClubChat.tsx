"use client";

import { useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useCurrentClubMember } from "../_lib/useCurrentClubMember";
import type { ClubComment } from "../_lib/types";

type Props = {
  clubId: string;
  comments: ClubComment[];
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

export function ClubChat({ clubId, comments }: Props) {
  const { member, loading, error: membershipError } =
    useCurrentClubMember(clubId);

  const [visibleComments, setVisibleComments] =
    useState<ClubComment[]>(comments);
  const [body, setBody] = useState("");
  const [localError, setLocalError] = useState("");
  const [isPending, startTransition] = useTransition();

  const canPost = !!member && !member.muted;
  const error = localError || membershipError;

  function handleSubmit() {
    const text = body.trim();

    if (!text || !canPost || loading || isPending) {
      return;
    }

    setLocalError("");

    startTransition(async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user?.id) {
          throw new Error("Auth session missing!");
        }

        const { data, error } = await supabase
          .from("club_comments")
          .insert({
            club_id: clubId,
            author_id: session.user.id,
            body: text,
          })
          .select("*")
          .single();

        if (error) {
          throw new Error(error.message);
        }

        setVisibleComments((current) => [data as ClubComment, ...current]);
        setBody("");
      } catch (err) {
        setLocalError(
          err instanceof Error ? err.message : "Failed to post comment.",
        );
      }
    });
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Club chat</h2>
        <p className="mt-2 text-sm text-slate-400">
          Members can post messages here in real time.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          disabled={!canPost || loading || isPending}
          placeholder={
            loading
              ? "Checking your permissions..."
              : canPost
                ? "Type a club comment..."
                : "You cannot post right now."
          }
          className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
        />

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canPost || loading || isPending || !body.trim()}
            className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Post comment
              </>
            )}
          </button>
        </div>

        {error ? (
          <div className="mt-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}
      </div>

      <div className="mt-4 space-y-3">
        {visibleComments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
            No comments yet.
          </div>
        ) : (
          visibleComments.map((comment) => (
            <article
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
            </article>
          ))
        )}
      </div>
    </section>
  );
}