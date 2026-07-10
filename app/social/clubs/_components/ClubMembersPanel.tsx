import Link from "next/link";
import {
  Crown,
  Shield,
  ShieldCheck,
  ShieldHalf,
  User,
  Users,
} from "lucide-react";

import { formatRank } from "../_lib/ranks";
import type { RankedGroup } from "../_lib/types";

type Props = {
  groups: RankedGroup[];
  base: string;
};

function getRankIcon(rank: string) {
  switch (rank) {
    case "leader":
      return <Crown className="h-5 w-5 text-amber-400" />;

    case "co_leader":
      return <ShieldCheck className="h-5 w-5 text-cyan-400" />;

    case "senior_admin":
      return <Shield className="h-5 w-5 text-violet-400" />;

    case "admin":
      return <ShieldHalf className="h-5 w-5 text-blue-400" />;

    case "coordinator":
      return <Users className="h-5 w-5 text-emerald-400" />;

    default:
      return <User className="h-5 w-5 text-slate-400" />;
  }
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function ClubMembersPanel({
  groups,
  base,
}: Props) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">

      <div className="mb-5 flex items-center justify-between">

        <div>
          <h2 className="text-xl font-semibold">
            Club Staff
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Leadership and staff members.
          </p>
        </div>

        <Link
          href={`${base}/members`}
          className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm transition hover:border-cyan-500 hover:bg-slate-900"
        >
          View all
        </Link>

      </div>

      <div className="space-y-8">

        {groups.map((group) => (

          <div key={group.rank}>

            <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-slate-400">

              {getRankIcon(group.rank)}

              {formatRank(group.rank)}

            </div>

            <div className="grid gap-4 sm:grid-cols-2">

              {group.members.map(({ member, profile }) => {

                const username =
                  profile?.username ??
                  member.user_id;

                return (

                  <Link
                    key={member.id}
                    href={
  profile?.username
    ? `/profile/${encodeURIComponent(profile.username)}`
    : "#"
}
                    className="flex items-center gap-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-500 hover:bg-slate-950"
                  >

                    {profile?.avatar_url ? (

                      <img
                        src={profile.avatar_url}
                        alt={username}
                        className="h-14 w-14 rounded-2xl object-cover"
                      />

                    ) : (

                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-800 text-sm font-bold">
                        {initials(username)}
                      </div>

                    )}

                    <div className="min-w-0">

                      <div className="truncate font-medium">
                        {username}
                      </div>

                      <div className="text-sm text-slate-400">
                        {formatRank(member.rank)}
                      </div>

                    </div>

                  </Link>

                );
              })}

            </div>

          </div>

        ))}

      </div>

    </section>
  );
}