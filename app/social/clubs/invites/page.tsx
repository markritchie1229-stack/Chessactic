"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, Inbox, Loader2, X } from "lucide-react";

import { supabase } from "@/lib/supabase";

type ClubInviteRow = {
  id: string;
  club_id: string;
  invited_by: string;
  invited_user_id: string;
  status: string;
  message: string | null;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
};

type ClubRow = {
  id: string;
  title: string;
  title_search: string;
  avatar_url: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type ClubMemberRow = {
  club_id: string;
  user_id: string;
  rank: string;
};

type InviteCard = ClubInviteRow & {
  club: ClubRow | null;
  inviter: ProfileRow | null;
  inviterRank: string | null;
};

export default function ClubInvitesInboxPage() {
  const [invites, setInvites] = useState<InviteCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [actionId, setActionId] = useState("");

  const pendingInvites = useMemo(
    () => invites.filter((invite) => invite.status === "pending"),
    [invites],
  );

  async function loadInvites() {
    setLoading(true);
    setError("");
    setStatus("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw new Error(userError.message);
      }

      if (!user) {
        setInvites([]);
        setError("You need to be signed in to view invites.");
        return;
      }

      const { data: inviteRows, error: inviteError } = await supabase
        .from("club_invites")
        .select("*")
        .eq("invited_user_id", user.id)
        .order("created_at", { ascending: false });

      if (inviteError) {
        throw new Error(inviteError.message);
      }

      const rows = (inviteRows ?? []) as ClubInviteRow[];

      const clubIds = [...new Set(rows.map((row) => row.club_id))];
      const invitedByIds = [...new Set(rows.map((row) => row.invited_by))];

      const [
        { data: clubsData, error: clubsError },
        { data: inviterData, error: inviterError },
        { data: memberData, error: memberError },
      ] = await Promise.all([
        clubIds.length
          ? supabase
              .from("clubs")
              .select("id, title, title_search, avatar_url")
              .in("id", clubIds)
          : Promise.resolve({ data: [], error: null }),
        invitedByIds.length
          ? supabase
              .from("profiles")
              .select("id, username, avatar_url")
              .in("id", invitedByIds)
          : Promise.resolve({ data: [], error: null }),
        invitedByIds.length && clubIds.length
          ? supabase
              .from("club_members")
              .select("club_id, user_id, rank")
              .in("club_id", clubIds)
              .in("user_id", invitedByIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (clubsError) {
        throw new Error(clubsError.message);
      }

      if (inviterError) {
        throw new Error(inviterError.message);
      }

      if (memberError) {
        throw new Error(memberError.message);
      }

      const clubs = new Map(
        ((clubsData ?? []) as ClubRow[]).map((club) => [club.id, club]),
      );
      const inviters = new Map(
        ((inviterData ?? []) as ProfileRow[]).map((profile) => [
          profile.id,
          profile,
        ]),
      );

      const ranks = new Map<string, string>();
      for (const row of (memberData ?? []) as ClubMemberRow[]) {
        ranks.set(`${row.club_id}:${row.user_id}`, row.rank);
      }

      const hydrated: InviteCard[] = rows.map((row) => ({
        ...row,
        club: clubs.get(row.club_id) ?? null,
        inviter: inviters.get(row.invited_by) ?? null,
        inviterRank: ranks.get(`${row.club_id}:${row.invited_by}`) ?? null,
      }));

      setInvites(hydrated);
    } catch (err) {
      setInvites([]);
      setError(err instanceof Error ? err.message : "Failed to load invites.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadInvites();
  }, []);

  async function respond(inviteId: string, action: "accepted" | "declined") {
    setActionId(inviteId);
    setError("");
    setStatus("");

    try {
      const { error: rpcError } = await supabase.rpc("respond_to_club_invite", {
        p_invite_id: inviteId,
        p_action: action,
      });

      if (rpcError) {
        throw new Error(rpcError.message);
      }

      setStatus(action === "accepted" ? "Invite accepted." : "Invite declined.");
      await loadInvites();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update invite.");
    } finally {
      setActionId("");
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="flex items-center gap-3">
            <Inbox className="h-5 w-5 text-cyan-400" />
            <div>
              <div className="text-sm uppercase tracking-[0.28em] text-slate-400">
                Social
              </div>
              <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
                Invite Inbox
              </h1>
            </div>
          </div>

          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">
            Pending club invites appear here. Accept one to join the club or
            decline it to remove it from your inbox.
          </p>
        </header>

        {error ? (
          <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {status ? (
          <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-200">
            {status}
          </div>
        ) : null}

        {loading ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-400 shadow-2xl shadow-black/20">
            <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
            Loading invites...
          </section>
        ) : pendingInvites.length === 0 ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl shadow-black/20">
            <h2 className="text-2xl font-semibold">No pending invites</h2>
            <p className="mt-3 text-sm text-slate-400">
              When someone invites you to a club, it will show up here.
            </p>

            <Link
              href="/social/clubs"
              className="mt-5 inline-flex items-center justify-center rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Browse clubs
            </Link>
          </section>
        ) : (
          <div className="space-y-4">
            {pendingInvites.map((invite) => (
              <article
                key={invite.id}
                className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-2xl shadow-black/20"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 gap-4">
                    {invite.club?.avatar_url ? (
                      <img
                        src={invite.club.avatar_url}
                        alt={invite.club.title}
                        className="h-14 w-14 shrink-0 rounded-2xl border border-slate-700 object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-lg font-bold">
                        {invite.club?.title?.charAt(0).toUpperCase() ?? "C"}
                      </div>
                    )}

                    <div className="min-w-0">
                      <h2 className="truncate text-xl font-semibold">
                        {invite.club?.title ?? "Club invite"}
                      </h2>

                      <p className="mt-1 text-sm text-slate-400">
                        Invited by{" "}
                        <span className="text-slate-200">
                          {invite.inviter?.username ?? invite.invited_by}
                        </span>
                        {invite.inviterRank ? (
                          <span className="ml-2 rounded-full border border-slate-700 bg-slate-950 px-2 py-0.5 text-[11px] uppercase tracking-[0.15em] text-slate-400">
                            {invite.inviterRank}
                          </span>
                        ) : null}
                      </p>

                      {invite.message ? (
                        <p className="mt-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
                          {invite.message}
                        </p>
                      ) : null}

                      <p className="mt-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                        Received {new Date(invite.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-3">
                    <button
                      type="button"
                      onClick={() => void respond(invite.id, "accepted")}
                      disabled={actionId === invite.id}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {actionId === invite.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Accept
                    </button>

                    <button
                      type="button"
                      onClick={() => void respond(invite.id, "declined")}
                      disabled={actionId === invite.id}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <X className="h-4 w-4" />
                      Decline
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}