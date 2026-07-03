"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Search, Shield } from "lucide-react";

import { MemberTable } from "../../_components/MemberTable";
import {
  demoteMember,
  getMyClubRank,
  kickMember,
  muteMember,
  promoteMember,
  unmuteMember,
} from "../../_lib/actions";
import { getClubBySlug, getClubMembers, getProfiles } from "../../_lib/queries";
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

export default function ClubMembersPage() {
  const params = useParams<ParamsShape>();
  const slug = useMemo(() => getSlugFromParams(params), [params]);

  const [club, setClub] = useState<ClubRecord | null>(null);
  const [members, setMembers] = useState<ClubMemberRecord[]>([]);
  const [profiles, setProfiles] = useState<Map<string, ProfileRecord>>(new Map());
  const [currentUserRank, setCurrentUserRank] = useState<ClubRank>("member");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!slug) return;

    setLoading(true);
    setError("");

    try {
      const clubData = await getClubBySlug(slug);

      if (!clubData) {
        setClub(null);
        setMembers([]);
        setProfiles(new Map());
        setCurrentUserRank("member");
        return;
      }

      const [memberData, myRank] = await Promise.all([
        getClubMembers(clubData.id),
        getMyClubRank(clubData.id),
      ]);

      const memberProfiles = await getProfiles(
        memberData.map((member) => member.user_id),
      );

      setClub(clubData);
      setMembers(memberData);
      setProfiles(memberProfiles);
      setCurrentUserRank(myRank ?? "member");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load members.");
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

  const handlePromote = async (member: ClubMemberRecord, nextRank: ClubRank) => {
    if (!club) return;

    setSaving(true);
    setError("");

    try {
      await promoteMember(club.id, currentUserRank, member, nextRank);
      await refreshAfterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to promote member.");
    } finally {
      setSaving(false);
    }
  };

  const handleDemote = async (member: ClubMemberRecord, nextRank: ClubRank) => {
    if (!club) return;

    setSaving(true);
    setError("");

    try {
      await demoteMember(club.id, currentUserRank, member, nextRank);
      await refreshAfterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to demote member.");
    } finally {
      setSaving(false);
    }
  };

  const handleKick = async (member: ClubMemberRecord) => {
    if (!club) return;

    setSaving(true);
    setError("");

    try {
      await kickMember(club.id, currentUserRank, member);
      await refreshAfterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to kick member.");
    } finally {
      setSaving(false);
    }
  };

  const handleMute = async (member: ClubMemberRecord) => {
    if (!club) return;

    setSaving(true);
    setError("");

    try {
      await muteMember(club.id, currentUserRank, member);
      await refreshAfterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mute member.");
    } finally {
      setSaving(false);
    }
  };

  const handleUnmute = async (member: ClubMemberRecord) => {
    if (!club) return;

    setSaving(true);
    setError("");

    try {
      await unmuteMember(club.id, currentUserRank, member);
      await refreshAfterMutation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unmute member.");
    } finally {
      setSaving(false);
    }
  };

  const filteredMembers = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return members;

    return members.filter((member) => {
      const profile = profiles.get(member.user_id);
      const username = (profile?.username ?? member.user_id).toLowerCase();
      return username.includes(term) || member.user_id.toLowerCase().includes(term);
    });
  }, [members, profiles, search]);

  if (!slug) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-400 shadow-2xl shadow-black/20">
        Missing club slug.
      </div>
    );
  }

  if (!loading && !club) {
    return (
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-center shadow-2xl shadow-black/20">
        <h2 className="text-2xl font-semibold">Club not found</h2>
        <p className="mt-3 text-sm text-slate-400">
          No active club matched this slug.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Member roster</h2>
            <p className="mt-2 text-sm text-slate-400">
              Search by username to make browsing easier.
            </p>
          </div>

          <div className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
            {filteredMembers.length} members
          </div>
        </div>

        <div className="relative mb-5">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by username"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 py-3 pl-11 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
          />
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-sm text-slate-400">
            Loading members...
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        ) : (
          <MemberTable
            members={filteredMembers}
            profiles={profiles}
            currentUserRank={currentUserRank}
            onPromote={handlePromote}
            onDemote={handleDemote}
            onKick={handleKick}
            onMute={handleMute}
            onUnmute={handleUnmute}
          />
        )}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <div className="mb-4 flex items-center gap-3">
          <Shield className="h-5 w-5 text-cyan-400" />
          <div>
            <h2 className="text-xl font-semibold">Permissions</h2>
            <p className="text-sm text-slate-400">
              The current role rules are enforced from this page.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {[
            "Leader: full control, disband, transfer leadership, moderation, and role changes.",
            "Co-Leader: manage most settings, moderate lower ranks, and handle rank changes up to Senior Admin.",
            "Senior Admin: moderate and manage up to Admin, including kicks and mutes below their rank.",
            "Admin: delete threads/comments and mute lower ranks.",
            "Coordinator and Member: invite and posting abilities as specified later.",
          ].map((item) => (
            <div
              key={item}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      {saving ? <div className="text-sm text-slate-400">Saving changes...</div> : null}
    </div>
  );
}