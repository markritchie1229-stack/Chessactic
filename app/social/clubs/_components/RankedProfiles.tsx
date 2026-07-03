import Link from "next/link";
import type { RankedGroup } from "../_lib/types";
import { formatRankLabel } from "../_lib/ranks";

type RankedProfilesProps = {
  groups: RankedGroup[];
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function RankedProfiles({ groups }: RankedProfilesProps) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Club Staff</h2>
        <p className="mt-2 text-sm text-slate-400">
          Coordinator and above are displayed below.
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
          No members available.
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.rank}>
              <div className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                {formatRankLabel(group.rank)}
              </div>

              <div className="flex flex-wrap gap-4">
                {group.members.map(({ member, profile }) => {
                  const username = profile?.username ?? member.user_id;

                  return (
                    <Link
                      key={member.id}
                      href={`/profile/${profile?.id ?? member.user_id}`}
                      className="flex flex-col items-center gap-2 transition hover:scale-105"
                    >
                      {profile?.avatar_url ? (
                        <img
                          src={profile.avatar_url}
                          alt={username}
                          className="h-14 w-14 rounded-2xl object-cover ring-1 ring-slate-700 transition hover:ring-cyan-500"
                        />
                      ) : (
                        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-sm font-semibold text-slate-200 transition hover:border-cyan-500 hover:text-cyan-300">
                          {getInitials(username)}
                        </div>
                      )}

                      <span className="max-w-[72px] truncate text-center text-xs text-slate-300">
                        {username}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}