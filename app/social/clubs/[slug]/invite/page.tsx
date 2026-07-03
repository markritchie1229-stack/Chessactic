"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { InviteForm } from "../../_components/InviteForm";
import { canInvite } from "../../_lib/permissions";
import { getClubBySlug, getClubMembers } from "../../_lib/queries";
import { supabase } from "../../_lib/supabase";
import type {
  ClubMemberRecord,
  ClubRecord,
  ClubRank,
  ProfileRecord,
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

  const [club, setClub] = useState<ClubRecord | null>(null);
  const [members, setMembers] = useState<ClubMemberRecord[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<ClubRank>("Member");
  const [results, setResults] = useState<ProfileRecord[]>([]);
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
        const clubData = await getClubBySlug(slug);

        if (!clubData) {
          if (mounted) {
            setClub(null);
            setMembers([]);
            setCurrentUserRank("Member");
          }
          return;
        }

        const memberData = await getClubMembers(clubData.id);
        const authUser = await supabase.auth.getUser();
        const userId = authUser.data.user?.id ?? null;
        const myMembership = userId
          ? memberData.find((member) => member.user_id === userId)
          : undefined;

        if (mounted) {
          setClub(clubData);
          setMembers(memberData);
          setCurrentUserRank(
            (myMembership?.rank as ClubRank | undefined) ?? "Member",
          );
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load invite page.");
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

  const invitedUserIds = useMemo(() => {
    return new Set(members.map((member) => member.user_id));
  }, [members]);

  const handleSearch = async (query: string) => {
    const term = query.trim();

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

      setResults((data ?? []) as ProfileRecord[]);
    } catch (err) {
      setResults([]);
      setError(err instanceof Error ? err.message : "Failed to search users.");
    } finally {
      setLoadingResults(false);
    }
  };

  const handleInvite = async (profile: ProfileRecord) => {
    if (!club) return;

    setError("");
    setStatus("");

    try {
      setStatus(`Invite sent to ${profile.username ?? profile.id}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite.");
    }
  };

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

  const inviteEnabled = canInvite(currentUserRank);

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        {!inviteEnabled ? (
          <div className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">
            You do not have permission to send invites.
          </div>
        ) : null}

        <InviteForm
          results={results}
          loading={loadingResults}
          onSearch={handleSearch}
          onInvite={handleInvite}
          canInvite={inviteEnabled}
        />

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
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <h2 className="text-xl font-semibold">Invite permissions</h2>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          Leaders, Co-Leaders, Senior Admins, Admins, and Coordinators can send invites.
        </p>
      </section>
    </div>
  );
}