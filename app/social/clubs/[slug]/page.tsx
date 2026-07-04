import { notFound } from "next/navigation";

import { ClubChat } from "../_components/ClubChat";
import { ClubMembersPanel } from "../_components/ClubMembersPanel";
import { RecentThreads } from "../_components/RecentThreads";
import {
  getClubBySlug,
  getClubMembers,
  getProfiles,
  getRecentComments,
  getRecentThreads,
} from "../_lib/server-queries";
import { CLUB_RANKS } from "../_lib/types";
import type { ClubPageParams, RankedGroup } from "../_lib/types";

type PageProps = {
  params: ClubPageParams;
};

function groupMembersByRank(
  members: Awaited<ReturnType<typeof getClubMembers>>,
  profiles: Awaited<ReturnType<typeof getProfiles>>,
): RankedGroup[] {
  const groups = new Map<string, RankedGroup>();

  for (const rank of CLUB_RANKS) {
    groups.set(rank, {
      rank,
      members: [],
    });
  }

  for (const member of members) {
    const group = groups.get(member.rank);
    if (!group) continue;

    group.members.push({
      member,
      profile: profiles.get(member.user_id),
    });
  }

  return CLUB_RANKS.flatMap((rank) => {
    const group = groups.get(rank);
    return group && group.members.length ? [group] : [];
  });
}

export default async function ClubPage({ params }: PageProps) {
  const { slug } = await params;

  const club = await getClubBySlug(slug);

  if (!club) {
    notFound();
  }

  const [members, recentComments, recentThreads] = await Promise.all([
    getClubMembers(club.id),
    getRecentComments(club.id, 20),
    getRecentThreads(club.id, 5),
  ]);

  const profiles = await getProfiles(members.map((member) => member.user_id));
  const rankedGroups = groupMembersByRank(members, profiles);

  const base = `/social/clubs/${club.title_search}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
      <main className="space-y-6">
        <ClubChat clubId={club.id} comments={recentComments} />
        <RecentThreads threads={recentThreads} base={base} />
      </main>

      <aside className="space-y-6">
        <ClubMembersPanel groups={rankedGroups} base={base} />

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <h2 className="text-xl font-semibold">Club status</h2>

          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              Leader has full control over club settings, moderation, rank changes,
              disbanding, and leadership transfer.
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              Co-Leader, Senior Admin, Admin, Coordinator, and Member permissions
              are enforced throughout the club.
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}