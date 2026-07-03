"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  ArrowUpRight,
  MessageSquare,
  Pin,
  PlusCircle,
  Search,
  Trash2,
} from "lucide-react";

import {
  createThread,
  deleteThread,
  getCurrentUserId,
  getMyClubRank,
} from "../../_lib/actions";
import { canCreateThread, canDeleteThread } from "../../_lib/permissions";
import { getClubBySlug, getClubThreads } from "../../_lib/queries";
import { supabase } from "../../_lib/supabase";
import type {
  ClubMemberRecord,
  ClubRecord,
  ClubRank,
  ThreadRecord,
} from "../../_lib/types";

type ParamsShape = {
  slug?: string | string[];
};

function getSlugFromParams(params: ParamsShape) {
  const value = params.slug;
  return Array.isArray(value) ? value[0] : value ?? "";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ClubForumPage() {
  const params = useParams<ParamsShape>();
  const slug = useMemo(() => getSlugFromParams(params), [params]);

  const [club, setClub] = useState<ClubRecord | null>(null);
  const [threads, setThreads] = useState<ThreadRecord[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRank, setCurrentUserRank] = useState<ClubRank>("member");
  const [currentMember, setCurrentMember] = useState<ClubMemberRecord | null>(null);
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const loadData = async () => {
    if (!slug) return;

    setLoading(true);
    setError("");
    setStatus("");

    try {
      const clubData = await getClubBySlug(slug);

      if (!clubData) {
        setClub(null);
        setThreads([]);
        setCurrentUserId(null);
        setCurrentUserRank("member");
        setCurrentMember(null);
        return;
      }

      const [threadData, userId, userRank] = await Promise.all([
        getClubThreads(clubData.id),
        getCurrentUserId(),
        getMyClubRank(clubData.id),
      ]);

      setClub(clubData);
      setThreads(threadData);
      setCurrentUserId(userId);
      setCurrentUserRank(userRank ?? "member");

      if (userId) {
        const { data: membership, error: membershipError } = await supabase
          .from("club_members")
          .select("id, club_id, user_id, rank, muted, created_at")
          .eq("club_id", clubData.id)
          .eq("user_id", userId)
          .maybeSingle();

        if (membershipError) {
          throw new Error(membershipError.message);
        }

        setCurrentMember((membership as ClubMemberRecord | null) ?? null);
      } else {
        setCurrentMember(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load forum.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const refreshAfterMutation = async () => {
    await loadData();
  };

  const canPost = currentMember ? canCreateThread(currentMember) : false;
  const canModerate = canDeleteThread(currentUserRank);

  const filteredThreads = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return threads;

    return threads.filter((thread) => {
      return (
        thread.title.toLowerCase().includes(term) ||
        (thread.author_id ?? "").toLowerCase().includes(term)
      );
    });
  }, [search, threads]);

  const handleCreateThread = async () => {
    if (!club) return;

    const trimmed = title.trim();
    if (!trimmed) {
      setError("Please enter a thread title.");
      return;
    }

    if (!currentUserId) {
      setError("You must be signed in to create a thread.");
      return;
    }

    if (!canPost) {
      setError("You are muted and cannot create threads.");
      return;
    }

    setSubmitting(true);
    setError("");
    setStatus("");

    try {
      await createThread(club.id, trimmed, currentUserId);
      setTitle("");
      setStatus("Thread created.");
      await refreshAfterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create thread.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteThread = async (thread: ThreadRecord) => {
    if (!club) return;

    setDeletingId(thread.id);
    setError("");
    setStatus("");

    try {
      await deleteThread(club.id, currentUserRank, thread.id);
      setStatus("Thread deleted.");
      await refreshAfterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete thread.");
    } finally {
      setDeletingId(null);
    }
  };

  if (!slug) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-400 shadow-2xl shadow-black/20">
        Missing club slug.
      </section>
    );
  }

  if (!loading && !club) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-center shadow-2xl shadow-black/20">
        <h2 className="text-2xl font-semibold">Club not found</h2>
        <p className="mt-3 text-sm text-slate-400">
          No active club matched this slug.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <main className="space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-xl font-semibold">Forum</h2>
              <p className="mt-2 text-sm text-slate-400">
                Threads live here. Muted members cannot create new threads.
              </p>
            </div>

            <button
              type="button"
              onClick={handleCreateThread}
              disabled={submitting || !canPost}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <PlusCircle className="h-4 w-4" />
              {submitting ? "Creating..." : "New Thread"}
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Thread title"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
            />

            <button
              type="button"
              onClick={handleCreateThread}
              disabled={submitting || !canPost}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 transition hover:border-cyan-500/60 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <ArrowUpRight className="h-4 w-4" />
              Post
            </button>
          </div>

          {!canPost ? (
            <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
              You are muted and cannot create new threads.
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          {status ? (
            <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
              {status}
            </div>
          ) : null}

          <div className="relative mt-5">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search threads"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 py-3 pl-11 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
            />
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="mb-4 flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-xl font-semibold">Recent threads</h2>
              <p className="text-sm text-slate-400">
                Loaded from the club_threads table.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-5 text-sm text-slate-400">
              Loading threads...
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-5 text-sm text-slate-400">
              No threads yet.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredThreads.map((thread) => (
                <div
                  key={thread.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-500/40 hover:bg-slate-950"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-100">{thread.title}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-400">
                        Author ID: {thread.author_id ?? "unknown"}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {formatDate(thread.created_at)}
                      </div>
                    </div>

                    {canModerate ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteThread(thread)}
                        disabled={deletingId === thread.id}
                        className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingId === thread.id ? "Deleting..." : "Delete"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <aside className="space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="mb-4 flex items-center gap-3">
            <Pin className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-xl font-semibold">Forum rules</h2>
              <p className="text-sm text-slate-400">
                All members can post threads unless muted.
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm leading-6 text-slate-300">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              Leaders, Co-Leaders, Senior Admins, and Admins can moderate threads.
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              Search and posting are handled directly from this page.
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}