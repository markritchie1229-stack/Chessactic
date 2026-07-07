import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Users } from "lucide-react";

import { MemberActionsMenu } from "./_components/MemberActionsMenu";
import { formatRank, getRankIndex } from "../../_lib/ranks";
import {
  getClubBySlug,
  getClubMembers,
  getCurrentMember,
  getProfiles,
} from "../../_lib/server-queries";
import type { ClubPageParams } from "../../_lib/types";

type PageProps = {
  params: ClubPageParams;
};

function toTime(value: string | null | undefined) {
  return value ? new Date(value).getTime() : 0;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default async function ClubMembersPage({ params }: PageProps) {
  const { slug } = await params;

  const club = await getClubBySlug(slug);

  if (!club) {
    notFound();
  }

  const [members, currentMember] = await Promise.all([
    getClubMembers(club.id),
    getCurrentMember(club.id),
  ]);

  const profiles = await getProfiles(
    members.map((member) => member.user_id),
  );

  const sortedMembers = [...members].sort((a, b) => {
    const rankDelta = getRankIndex(a.rank) - getRankIndex(b.rank);

    if (rankDelta !== 0) {
      return rankDelta;
    }

    return toTime(a.created_at) - toTime(b.created_at);
  });

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
              <Users className="h-3.5 w-3.5" />
              Member Directory
            </div>

            <h1 className="text-3xl font-semibold">Members</h1>

            <p className="mt-2 text-sm text-slate-400">
              {members.length} member{members.length === 1 ? "" : "s"} in{" "}
              <span className="font-medium text-slate-200">
                {club.title}
              </span>
            </p>
          </div>

          <Link
            href={`/social/clubs/${club.title_search}`}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-500 hover:bg-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Club
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <div className="space-y-3">
          {sortedMembers.map((member) => {
            const profile = profiles.get(member.user_id) ?? null;
            const username = profile?.username ?? member.user_id;
            const isSelf = currentMember?.id === member.id;

            return (
              <div
                key={member.id}
                className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-center gap-4">
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={username}
                      className="h-14 w-14 rounded-2xl border border-slate-700 object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-sm font-bold">
                      {initials(username)}
                    </div>
                  )}

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        href={
                          profile?.username
                            ? `/social/profile/${profile.username.toLowerCase()}`
                            : "#"
                        }
                        className="truncate font-medium text-slate-100 hover:text-cyan-300"
                      >
                        {username}
                      </Link>

                      {isSelf ? (
                        <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[11px] font-medium text-cyan-200">
                          You
                        </span>
                      ) : null}

                      {member.muted ? (
                        <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[11px] font-medium text-red-200">
                          Muted
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-1 text-sm text-slate-400">
                      {formatRank(member.rank)}
                    </div>
                  </div>
                </div>

                <MemberActionsMenu
                  clubId={club.id}
                  actorRank={currentMember?.rank ?? null}
                  member={member}
                  profile={profile}
                />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}