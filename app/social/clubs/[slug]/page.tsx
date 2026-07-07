import { notFound } from "next/navigation";

import { ClubChat } from "../_components/ClubChat";
import { ClubMembersPanel } from "../_components/ClubMembersPanel";
import { RecentThreads } from "../_components/RecentThreads";
import { canReviewJoinRequests } from "../_lib/permissions";
import {
  getClubBySlug,
  getClubMembers,
  getCurrentMember,
  getProfiles,
  getRecentComments,
  getRecentThreads,
  recordClubActivity,
} from "../_lib/server-queries";
import { createSupabaseServerClient } from "../_lib/supabase-server";
import { CLUB_RANKS } from "../_lib/types";
import type { ClubPageParams, RankedGroup } from "../_lib/types";

import { ClubJoinButton } from "./_components/ClubJoinButton";
import { ClubJoinRequests } from "./_components/ClubJoinRequests";

type PageProps = {
  params: ClubPageParams;
};

type JoinRequestRow = {
  id: string;
  user_id: string;
  created_at: string;
};

type JoinRequestView = JoinRequestRow & {
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
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

  await recordClubActivity(club.id);

  const [members, recentComments, recentThreads, currentMember] =
    await Promise.all([
      getClubMembers(club.id),
      getRecentComments(club.id, 20),
      getRecentThreads(club.id, 5),
      getCurrentMember(club.id),
    ]);

  const profiles = await getProfiles(members.map((member) => member.user_id));
  const rankedGroups = groupMembersByRank(members, profiles).filter(
    (group) => group.rank !== "member",
  );

  let joinRequests: JoinRequestView[] = [];

  if (currentMember && canReviewJoinRequests(currentMember.rank)) {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("club_join_requests")
      .select("id, user_id, created_at")
      .eq("club_id", club.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    const requestRows = (data ?? []) as JoinRequestRow[];
    const requestProfiles = await getProfiles(
      requestRows.map((request) => request.user_id),
    );

    joinRequests = requestRows.map((request) => {
      const profile = requestProfiles.get(request.user_id);

      return {
        ...request,
        profiles: profile
          ? {
              username: profile.username ?? null,
              avatar_url: profile.avatar_url ?? null,
            }
          : null,
      };
    });
  }

  const base = `/social/clubs/${club.title_search}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
      <main className="space-y-6">
        {!currentMember ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold">Join this club</h2>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {club.join_policy === "request"
                    ? "This club requires approval before new members can enter."
                    : "Anyone can join this club immediately."}
                </p>
              </div>

              <ClubJoinButton clubId={club.id} joinPolicy={club.join_policy} />
            </div>
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
            <h2 className="text-xl font-semibold">Membership</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              You are already in this club as{" "}
              <span className="font-semibold text-slate-200">
                {currentMember.rank.replace("_", " ")}
              </span>
              .
            </p>
          </section>
        )}

        <ClubChat clubId={club.id} comments={recentComments} />
        <RecentThreads threads={recentThreads} base={base} />
      </main>

      <aside className="space-y-6">
        <ClubMembersPanel groups={rankedGroups} base={base} />

        {currentMember && canReviewJoinRequests(currentMember.rank) ? (
          <ClubJoinRequests requests={joinRequests} />
        ) : null}

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <h2 className="text-xl font-semibold">Club status</h2>

          <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              Leader has full control over club settings, moderation, rank
              changes, disbanding, and leadership transfer.
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              Co-Leader, Senior Admin, Admin, Coordinator, and Member
              permissions are enforced throughout the club.
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
