"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Ban, ChevronDown, ChevronUp, ShieldAlert, UserX } from "lucide-react";
import type {
  ClubMemberRecord,
  ClubRank,
  ProfileRecord,
} from "../_lib/types";
import {
  canDemote,
  canKick,
  canMute,
  canPromote,
} from "../_lib/permissions";
import {
  getNextHigherRank,
  getNextLowerRank,
  isHigherRank,
} from "../_lib/ranks";

type MemberTableProps = {
  members: ClubMemberRecord[];
  profiles: Map<string, ProfileRecord>;
  currentUserRank: ClubRank;
  onPromote?: (member: ClubMemberRecord, nextRank: ClubRank) => Promise<void> | void;
  onDemote?: (member: ClubMemberRecord, nextRank: ClubRank) => Promise<void> | void;
  onKick?: (member: ClubMemberRecord) => Promise<void> | void;
  onMute?: (member: ClubMemberRecord) => Promise<void> | void;
  onUnmute?: (member: ClubMemberRecord) => Promise<void> | void;
};

function formatJoinDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "?";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return `${first}${second}`.toUpperCase();
}

export function MemberTable({
  members,
  profiles,
  currentUserRank,
  onPromote,
  onDemote,
  onKick,
  onMute,
  onUnmute,
}: MemberTableProps) {
  const sortedMembers = useMemo(() => {
    return [...members].sort((a, b) => {
      const aProfile = profiles.get(a.user_id);
      const bProfile = profiles.get(b.user_id);
      const aName = (aProfile?.username ?? a.user_id).toLowerCase();
      const bName = (bProfile?.username ?? b.user_id).toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [members, profiles]);

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Member roster</h2>
          <p className="mt-2 text-sm text-slate-400">
            Search by username to make browsing easier.
          </p>
        </div>

        <div className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
          {members.length} members
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-950 text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">Username</th>
              <th className="px-4 py-3 font-medium">Rank</th>
              <th className="px-4 py-3 font-medium">Join date</th>
              <th className="px-4 py-3 font-medium">Muted</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-800 bg-slate-900/60">
            {sortedMembers.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-slate-400" colSpan={5}>
                  No members are in this club yet.
                </td>
              </tr>
            ) : (
              sortedMembers.map((member) => {
                const profile = profiles.get(member.user_id);
                const username = profile?.username ?? member.user_id;
                const initials = getInitials(username);
                const isMuted = Boolean(member.muted);

                const nextHigher = getNextHigherRank(member.rank);
                const nextLower = getNextLowerRank(member.rank);

                const canActOnThisMember =
                  isHigherRank(currentUserRank, member.rank) ||
                  currentUserRank === "Leader";

                return (
                  <tr key={member.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-xs font-semibold text-slate-200">
                          {profile?.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={profile.avatar_url}
                              alt={username}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            initials
                          )}
                        </div>

                        <div>
                          <div className="font-medium text-slate-100">
                            <Link
                              href={`/profile/${profile?.id ?? member.user_id}`}
                              className="hover:text-cyan-300"
                            >
                              {username}
                            </Link>
                          </div>
                          <div className="text-xs text-slate-500">
                            {member.user_id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-300">{member.rank}</td>
                    <td className="px-4 py-3 text-slate-400">
                      {formatJoinDate(member.created_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {isMuted ? "Yes" : "No"}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {canPromote(currentUserRank, member.rank) && nextHigher ? (
                          <button
                            type="button"
                            onClick={() => onPromote?.(member, nextHigher)}
                            disabled={!onPromote}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 transition hover:border-cyan-500/60 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <ChevronUp className="h-3.5 w-3.5" />
                            Promote
                          </button>
                        ) : null}

                        {canDemote(currentUserRank, member.rank) && nextLower ? (
                          <button
                            type="button"
                            onClick={() => onDemote?.(member, nextLower)}
                            disabled={!onDemote}
                            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 transition hover:border-cyan-500/60 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <ChevronDown className="h-3.5 w-3.5" />
                            Demote
                          </button>
                        ) : null}

                        {canKick(currentUserRank, member.rank) ? (
                          <button
                            type="button"
                            onClick={() => onKick?.(member)}
                            disabled={!onKick}
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <UserX className="h-3.5 w-3.5" />
                            Kick
                          </button>
                        ) : null}

                        {canMute(currentUserRank, member.rank) && !isMuted ? (
                          <button
                            type="button"
                            onClick={() => onMute?.(member)}
                            disabled={!onMute}
                            className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Ban className="h-3.5 w-3.5" />
                            Mute
                          </button>
                        ) : null}

                        {canMute(currentUserRank, member.rank) && isMuted ? (
                          <button
                            type="button"
                            onClick={() => onUnmute?.(member)}
                            disabled={!onUnmute}
                            className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <ShieldAlert className="h-3.5 w-3.5" />
                            Unmute
                          </button>
                        ) : null}

                        {!canActOnThisMember ? (
                          <span className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-500">
                            No actions
                          </span>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}