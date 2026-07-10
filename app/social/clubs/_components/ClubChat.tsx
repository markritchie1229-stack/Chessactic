"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Loader2, Send, X } from "lucide-react";

import { deleteClubComment, postComment } from "../_lib/server-actions";
import { supabase } from "@/lib/supabase";
import { useCurrentClubMember } from "../_lib/useCurrentClubMember";
import type { ClubComment } from "../_lib/types";

type Props = {
  clubId: string;
  comments: ClubComment[];
};

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

const MODERATOR_RANKS = new Set([
  "leader",
  "co_leader",
  "senior_admin",
  "admin",
]);

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
  const { member, loading, error: membershipError } = useCurrentClubMember(clubId);

  const [visibleComments, setVisibleComments] = useState<ClubComment[]>(comments);
  const [body, setBody] = useState("");
  const [localError, setLocalError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [profilesById, setProfilesById] = useState<Record<string, ProfileRow>>({});

  const canPost = !!member && !member.muted;
  const canModerate = !!member && MODERATOR_RANKS.has(member.rank);
  const error = localError || membershipError;

  const authorIds = useMemo(() => {
    const ids = new Set<string>();

    for (const comment of visibleComments) {
      if (comment.author_id) {
        ids.add(comment.author_id);
      }
    }

    return Array.from(ids);
  }, [visibleComments]);

  useEffect(() => {
    let cancelled = false;

    async function loadProfiles() {
      if (authorIds.length === 0) {
        setProfilesById({});
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,avatar_url")
        .in("id", authorIds);

      if (cancelled) return;

      if (error) {
        console.error("Failed to load comment author profiles:", error.message);
        return;
      }

      const nextMap: Record<string, ProfileRow> = {};

      for (const row of (data ?? []) as ProfileRow[]) {
        nextMap[row.id] = row;
      }

      setProfilesById(nextMap);
    }

    void loadProfiles();

    return () => {
      cancelled = true;
    };
  }, [authorIds]);

  function handleSubmit() {
  const text = body.trim();

  if (!text || !canPost || loading || isPending) {
    return;
  }

  setLocalError("");

  startTransition(async () => {
    try {
      const created = await postComment(clubId, text, null);
      setVisibleComments((current) => [created, ...current]);
      setBody("");
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to post comment.",
      );
    }
  });
}

  async function handleDelete(commentId: string) {
    if (deletingId === commentId) return;

    const confirmed = window.confirm("Delete this comment?");
    if (!confirmed) return;

    setLocalError("");
    setDeletingId(commentId);

    try {
      await deleteClubComment(clubId, commentId);
      setVisibleComments((current) =>
        current.filter((comment) => comment.id !== commentId),
      );
    } catch (err) {
      setLocalError(
        err instanceof Error ? err.message : "Failed to delete comment.",
      );
    } finally {
      setDeletingId(null);
    }
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
          visibleComments.map((comment) => {
            const profile = comment.author_id
              ? profilesById[comment.author_id]
              : null;

            const displayName =
              profile?.username?.trim() || comment.author_id || "Member";

            const profileHref = profile?.username
              ? `/profile/${encodeURIComponent(profile.username)}`
              : null;

            const canDeleteThisComment =
              !!member &&
              (member.user_id === comment.author_id || canModerate);

            return (
              <article
                key={comment.id}
                className="relative rounded-2xl border border-slate-800 bg-slate-950/60 p-4 pr-12"
              >
                {canDeleteThisComment ? (
                  <button
                    type="button"
                    onClick={() => void handleDelete(comment.id)}
                    disabled={deletingId === comment.id}
                    aria-label="Delete comment"
                    className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-300 transition hover:border-rose-500 hover:text-rose-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {deletingId === comment.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </button>
                ) : null}

                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-slate-100">
                    {profileHref ? (
                      <Link
                        href={profileHref}
                        className="transition hover:text-cyan-400 hover:underline"
                      >
                        {displayName}
                      </Link>
                    ) : (
                      displayName
                    )}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatDate(comment.created_at)}
                  </div>
                </div>

                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                  {comment.body}
                </p>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}