import { notFound } from "next/navigation";

import { ClubMembersPanel } from "../../_components/ClubMembersPanel";
import {
  getClubBySlug,
  getClubMembers,
  getCurrentMember,
  getProfiles,
} from "../../_lib/server-queries";
import { CLUB_RANKS } from "../../_lib/types";
import type { ClubPageParams, RankedGroup } from "../../_lib/types";

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

  const profiles = await getProfiles(members.map((member) => member.user_id));
  const groups = groupMembersByRank(members, profiles);
  const base = `/social/clubs/${club.title_search}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <ClubMembersPanel
        groups={groups}
        base={base}
      />

      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <h2 className="text-xl font-semibold">Member management</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Use this page to promote, demote, mute, unmute, kick, and transfer leadership.
        </p>

        <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            Leader can manage every role except another leader.
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            Co-Leader can manage staff below leader and handle settings/invites.
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            Current status:{" "}
            {currentMember ? `you are ${currentMember.rank}.` : "you are not a member."}
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
          Next we will add the member action controls here.
        </div>
      </section>
    </div>
  );
}