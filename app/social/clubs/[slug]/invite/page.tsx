"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { canInvite } from "../../_lib/permissions";
import { useCurrentClubMember } from "../../_lib/useCurrentClubMember";
import type {
  Club,
  ClubMember,
  ClubRank,
  Profile,
} from "../../_lib/types";

type ParamsShape = {
  slug?: string | string[];
};

function getSlugFromParams(params: ParamsShape) {
  const value = params.slug;
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default function ClubInvitePage() {
  const params = useParams<ParamsShape>();
  const slug = useMemo(() => getSlugFromParams(params), [params]);

  const [club, setClub] = useState<Club | null>(null);
  const [members, setMembers] = useState<ClubMember[]>([]);
  const [results, setResults] = useState<Profile[]>([]);
  const [search, setSearch] = useState("");
  const [loadingClub, setLoadingClub] = useState(true);
  const [loadingResults, setLoadingResults] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadClub() {
      if (!slug) return;

      setLoadingClub(true);
      setError("");
      setStatus("");

      try {
        const { data: clubData, error: clubError } = await supabase
          .from("clubs")
          .select("*")
          .eq("title_search", slug)
          .is("disbanded_at", null)
          .maybeSingle();

        if (clubError) {
          throw new Error(clubError.message);
        }

        if (!clubData) {
          if (mounted) {
            setClub(null);
            setMembers([]);
          }
          return;
        }

        const { data: memberData, error: memberError } = await supabase
          .from("club_members")
          .select("*")
          .eq("club_id", clubData.id)
          .order("created_at", { ascending: true });

        if (memberError) {
          throw new Error(memberError.message);
        }

        if (mounted) {
          setClub(clubData as Club);
          setMembers((memberData ?? []) as ClubMember[]);
        }
      } catch (err) {
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to load invite page.",
          );
        }
      } finally {
        if (mounted) {
          setLoadingClub(false);
        }
      }
    }

    void loadClub();

    return () => {
      mounted = false;
    };
  }, [slug]);

  const clubMember = useCurrentClubMember(club?.id ?? "");

  const invitedUserIds = useMemo(() => {
    return new Set(members.map((member) => member.user_id));
  }, [members]);

  const inviteEnabled =
    !clubMember.loading && !!clubMember.member && canInvite(clubMember.member.rank);

  useEffect(() => {
    let mounted = true;

    async function handleSearch() {
      const term = search.trim();

      setError("");
      setStatus("");

      if (!term) {
        setResults([]);
        return;
      }

      setLoadingResults(true);

      try {
        const { data, error: searchError } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, last_seen, bio")
          .or(`username.ilike.%${term}%,bio.ilike.%${term}%`)
          .order("username", { ascending: true })
          .limit(20);

        if (searchError) {
          throw new Error(searchError.message);
        }

        if (mounted) {
          setResults((data ?? []) as Profile[]);
        }
      } catch (err) {
        if (mounted) {
          setResults([]);
          setError(
            err instanceof Error ? err.message : "Failed to search users.",
          );
        }
      } finally {
        if (mounted) {
          setLoadingResults(false);
        }
      }
    }

    void handleSearch();

    return () => {
      mounted = false;
    };
  }, [search]);

  async function handleInvite(profile: Profile) {
    if (!club) return;

    setError("");
    setStatus("");

    try {
      if (invitedUserIds.has(profile.id)) {
        setStatus(`${profile.username ?? profile.id} is already a member.`);
        return;
      }

      setStatus(`Invite ready for ${profile.username ?? profile.id}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite.");
    }
  }

  if (!slug) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-400 shadow-2xl shadow-black/20">
        Missing club slug.
      </section>
    );
  }

  if (loadingClub) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-400 shadow-2xl shadow-black/20">
        Loading invite page...
      </section>
    );
  }

  if (!club) {
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
    <div className="grid gap-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <div className="mb-4 flex items-center gap-3">
          <UserPlus className="h-5 w-5 text-cyan-400" />
          <div>
            <h2 className="text-xl font-semibold">Invite members</h2>
            <p className="mt-2 text-sm text-slate-400">
              Leaders, Co-Leaders, Senior Admins, Admins, and Coordinators can
              send invites.
            </p>
          </div>
        </div>

        {clubMember.loading ? (
          <div className="mb-4 rounded-2xl border border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
            Checking your permissions...
          </div>
        ) : !clubMember.member ? (
          <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            You are not a member of this club.
          </div>
        ) : !inviteEnabled ? (
          <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            You do not have permission to send invites.
          </div>
        ) : null}

        <label className="grid gap-2">
          <span className="text-sm font-medium text-slate-100">
            Search users
          </span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by username or bio"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
          />
        </label>

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

        <div className="mt-6 space-y-3">
          {loadingResults ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              Searching users...
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
              No users found.
            </div>
          ) : (
            results.map((profile) => (
              <div
                key={profile.id}
                className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="font-medium text-slate-100">
                    {profile.username ?? profile.id}
                  </div>
                  <div className="mt-1 text-sm text-slate-400">
                    {profile.bio?.trim() || "No bio provided."}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void handleInvite(profile)}
                  disabled={!inviteEnabled}
                  className="inline-flex items-center justify-center rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Invite
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}