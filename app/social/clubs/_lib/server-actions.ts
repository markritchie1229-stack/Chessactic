"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "./supabase-server";
import { logClubAction } from "./audit";
import { getProfiles } from "./server-queries";
import {
  canComment,
  canCreateThread,
  canDisbandClub,
  canKick,
  canMute,
  canOpenSettings,
  canPromote,
  canReviewJoinRequests,
  canTransferLeadership,
} from "./permissions";
import type {
  Club,
  ClubComment,
  ClubMember,
  ClubRank,
  ClubThread,
  Profile,
} from "./types";

type ClubJoinPolicy = "open" | "request";

type ClubMemberSearchResult = {
  member: ClubMember;
  profile: Profile | null;
};

async function getAuthedContext() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error("You must be signed in to do that.");
  }

  return { supabase, user };
}

async function getActorMember(clubId: string): Promise<ClubMember> {
  const { supabase, user } = await getAuthedContext();

  const { data, error } = await supabase
    .from("club_members")
    .select("*")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("You are not a member of this club.");
  }

  return data as ClubMember;
}

async function getClub(
  clubId: string,
): Promise<(Club & { join_policy: ClubJoinPolicy }) | null> {
  const { supabase } = await getAuthedContext();

  const { data, error } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", clubId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as (Club & { join_policy: ClubJoinPolicy }) | null) ?? null;
}

export async function getMyClubRankServer(
  clubId: string,
): Promise<ClubRank | null> {
  const member = await getActorMember(clubId);
  return member.rank;
}

export async function searchClubMemberByUsername(
  clubId: string,
  username: string,
): Promise<ClubMemberSearchResult | null> {
  const actor = await getActorMember(clubId);

  if (actor.rank !== "leader") {
    throw new Error("Only the current leader can transfer leadership.");
  }

  const term = username.trim().toLowerCase();

  if (!term) {
    return null;
  }

  const { supabase } = await getAuthedContext();

  const { data: membersData, error } = await supabase
    .from("club_members")
    .select("*")
    .eq("club_id", clubId);

  if (error) {
    throw new Error(error.message);
  }

  const members = (membersData ?? []) as ClubMember[];

  if (members.length === 0) {
    return null;
  }

  const profiles = await getProfiles(members.map((member) => member.user_id));

  const matches = members
    .map((member) => {
      const profile = profiles.get(member.user_id) ?? null;
      const usernameValue = profile?.username?.trim().toLowerCase() ?? "";
      const userIdValue = member.user_id.toLowerCase();

      return {
        member,
        profile,
        usernameValue,
        userIdValue,
      };
    })
    .filter(({ usernameValue, userIdValue }) => {
      return usernameValue.includes(term) || userIdValue.includes(term);
    });

  if (matches.length === 0) {
    return null;
  }

  const exact =
    matches.find(({ usernameValue, userIdValue }) => {
      return usernameValue === term || userIdValue === term;
    }) ?? matches[0];

  return {
    member: exact.member,
    profile: exact.profile,
  };
}

export async function createClub(input: {
  title: string;
  description: string;
  avatarUrl?: string | null;
  bannerUrl?: string | null;
}): Promise<Club> {
  const { supabase, user } = await getAuthedContext();

  const title = input.title.trim();
  if (!title) {
    throw new Error("Club title cannot be empty.");
  }

  const normalize = (value?: string | null) => {
    const trimmed = (value ?? "").trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const { data: inserted, error: clubError } = await supabase
    .from("clubs")
    .insert({
      title,
      description: normalize(input.description),
      avatar_url: normalize(input.avatarUrl),
      banner_url: normalize(input.bannerUrl),
      join_policy: "open",
      created_by: user.id,
    })
    .select("id")
    .single();

  if (clubError) {
    throw new Error(clubError.message);
  }

  if (!inserted) {
    throw new Error("Club creation succeeded but no club row was returned.");
  }

  const { data: club, error: fetchError } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", inserted.id)
    .single();

  if (fetchError) {
    throw new Error(fetchError.message);
  }

  if (!club) {
    throw new Error("Club creation succeeded but the club could not be loaded.");
  }

  await logClubAction({
    clubId: club.id,
    action: "club_created",
    actorId: user.id,
    details: {
      title: club.title,
    },
  });

  revalidatePath("/social/clubs");

  return club as Club;
}

export async function updateClubAppearance(
  clubId: string,
  actorRank: ClubRank,
  input: {
    title: string;
    description: string;
    avatarUrl: string;
    bannerUrl: string;
  },
): Promise<Club> {
  const actor = await getActorMember(clubId);

  if (!canOpenSettings(actor.rank)) {
    throw new Error("Only the leader or co-leader can edit club appearance.");
  }

  const title = input.title.trim();
  if (!title) {
    throw new Error("Club title cannot be empty.");
  }

  const normalize = (value: string) => {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  };

  const { supabase } = await getAuthedContext();

  const { data: existing, error: existingError } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", clubId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  const previous = existing as Club | null;

  const { error } = await supabase
    .from("clubs")
    .update({
      title,
      description: normalize(input.description),
      avatar_url: normalize(input.avatarUrl),
      banner_url: normalize(input.bannerUrl),
    })
    .eq("id", clubId);

  if (error) {
    throw new Error(error.message);
  }

  const { data: updated, error: updatedError } = await supabase
    .from("clubs")
    .select("*")
    .eq("id", clubId)
    .maybeSingle();

  if (updatedError) {
    throw new Error(updatedError.message);
  }

  await logClubAction({
    clubId,
    action: "club_updated",
    actorId: actor.user_id,
    details: {
      old_title: previous?.title ?? null,
      new_title: title,
      old_description: previous?.description ?? null,
      new_description: normalize(input.description),
      old_avatar_url: previous?.avatar_url ?? null,
      new_avatar_url: normalize(input.avatarUrl),
      old_banner_url: previous?.banner_url ?? null,
      new_banner_url: normalize(input.bannerUrl),
    },
  });

  revalidatePath(`/social/clubs/${previous?.title_search ?? clubId}/settings`);
  revalidatePath("/social/clubs");

  if (!updated) {
    throw new Error("Club update succeeded but the updated club could not be loaded.");
  }

  return updated as Club;
}
export async function setJoinPolicy(
  clubId: string,
  joinPolicy: ClubJoinPolicy,
) {
  const actor = await getActorMember(clubId);

  if (!canOpenSettings(actor.rank)) {
    throw new Error("Only the leader or co-leader can change join policy.");
  }

  const club = await getClub(clubId);
  const { supabase } = await getAuthedContext();

  const { error } = await supabase
    .from("clubs")
    .update({ join_policy: joinPolicy })
    .eq("id", clubId);

  if (error) {
    throw new Error(error.message);
  }

  await logClubAction({
    clubId,
    action: "club_updated",
    actorId: actor.user_id,
    details: {
      join_policy: joinPolicy,
    },
  });

  if (club) {
    revalidatePath(`/social/clubs/${club.title_search}`);
  }
  revalidatePath("/social/clubs");
}

export async function joinClub(clubId: string) {
  const { supabase, user } = await getAuthedContext();
  const club = await getClub(clubId);

  if (!club) {
    throw new Error("Club not found.");
  }

  const { data: existingMember, error: memberError } = await supabase
    .from("club_members")
    .select("*")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError) {
    throw new Error(memberError.message);
  }

  if (existingMember) {
    return { status: "already_member" as const };
  }

  if (club.join_policy === "request") {
    const { error } = await supabase.from("club_join_requests").upsert({
      club_id: clubId,
      user_id: user.id,
      status: "pending",
      reviewed_at: null,
      reviewed_by: null,
    });

    if (error) {
      throw new Error(error.message);
    }

    await logClubAction({
      clubId,
      action: "join_requested",
      actorId: user.id,
      details: {
        join_policy: club.join_policy,
      },
    });

    revalidatePath(`/social/clubs/${club.title_search}`);
    revalidatePath("/social/clubs");

    return { status: "requested" as const };
  }

  const { error } = await supabase.from("club_members").insert({
    club_id: clubId,
    user_id: user.id,
    rank: "member",
    muted: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  await logClubAction({
    clubId,
    action: "member_joined",
    actorId: user.id,
    details: {
      join_policy: club.join_policy,
    },
  });

  revalidatePath(`/social/clubs/${club.title_search}`);
  revalidatePath("/social/clubs");

  return { status: "joined" as const };
}

export async function approveJoinRequest(requestId: string) {
  const { supabase, user } = await getAuthedContext();

  const { data: request, error: requestError } = await supabase
    .from("club_join_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) {
    throw new Error(requestError.message);
  }

  if (!request) {
    throw new Error("Join request not found.");
  }

  const actor = await getActorMember(request.club_id);

  if (!canReviewJoinRequests(actor.rank)) {
    throw new Error("You do not have permission to review join requests.");
  }

  const club = await getClub(request.club_id);

  const { error: memberError } = await supabase.from("club_members").insert({
    club_id: request.club_id,
    user_id: request.user_id,
    rank: "member",
    muted: false,
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  const { error: deleteError } = await supabase
    .from("club_join_requests")
    .delete()
    .eq("id", requestId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  await logClubAction({
    clubId: request.club_id,
    action: "join_request_approved",
    actorId: user.id,
    targetUserId: request.user_id,
    details: {
      request_id: requestId,
    },
  });

  if (club) {
    revalidatePath(`/social/clubs/${club.title_search}`);
  }
  revalidatePath("/social/clubs");
}

export async function declineJoinRequest(requestId: string) {
  const { supabase, user } = await getAuthedContext();

  const { data: request, error: requestError } = await supabase
    .from("club_join_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) {
    throw new Error(requestError.message);
  }

  if (!request) {
    throw new Error("Join request not found.");
  }

  const actor = await getActorMember(request.club_id);

  if (!canReviewJoinRequests(actor.rank)) {
    throw new Error("You do not have permission to review join requests.");
  }

  const club = await getClub(request.club_id);

  const { error } = await supabase
    .from("club_join_requests")
    .delete()
    .eq("id", requestId);

  if (error) {
    throw new Error(error.message);
  }

  await logClubAction({
    clubId: request.club_id,
    action: "join_request_declined",
    actorId: user.id,
    targetUserId: request.user_id,
    details: {
      request_id: requestId,
    },
  });

  if (club) {
    revalidatePath(`/social/clubs/${club.title_search}`);
  }
  revalidatePath("/social/clubs");
}

export async function disbandClub(
  clubId: string,
  actorRank: ClubRank,
) {
  const actor = await getActorMember(clubId);

  if (!canDisbandClub(actor.rank)) {
    throw new Error("Only the leader can disband the club.");
  }

  const { supabase } = await getAuthedContext();

  const { error } = await supabase
    .from("clubs")
    .update({ disbanded_at: new Date().toISOString() })
    .eq("id", clubId);

  if (error) {
    throw new Error(error.message);
  }

  await logClubAction({
    clubId,
    action: "club_disbanded",
    actorId: actor.user_id,
    details: {
      rank: actor.rank,
    },
  });

  revalidatePath("/social/clubs");
}

export async function promoteMember(
  clubId: string,
  actorRank: ClubRank,
  member: ClubMember,
  nextRank: ClubRank,
) {
  const actor = await getActorMember(clubId);

  if (!canPromote(actor.rank, member.rank)) {
    throw new Error("You do not have permission to promote this member.");
  }

  const { supabase } = await getAuthedContext();

  const { error } = await supabase
    .from("club_members")
    .update({ rank: nextRank })
    .eq("id", member.id)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(error.message);
  }

  await logClubAction({
    clubId,
    action: "member_promoted",
    actorId: actor.user_id,
    targetUserId: member.user_id,
    details: {
      from_rank: member.rank,
      to_rank: nextRank,
    },
  });
}

export async function demoteMember(
  clubId: string,
  actorRank: ClubRank,
  member: ClubMember,
  nextRank: ClubRank,
) {
  const actor = await getActorMember(clubId);

  if (!canPromote(actor.rank, member.rank)) {
    throw new Error("You do not have permission to demote this member.");
  }

  const { supabase } = await getAuthedContext();

  const { error } = await supabase
    .from("club_members")
    .update({ rank: nextRank })
    .eq("id", member.id)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(error.message);
  }

  await logClubAction({
    clubId,
    action: "member_demoted",
    actorId: actor.user_id,
    targetUserId: member.user_id,
    details: {
      from_rank: member.rank,
      to_rank: nextRank,
    },
  });
}

export async function kickMember(
  clubId: string,
  actorRank: ClubRank,
  member: ClubMember,
) {
  const actor = await getActorMember(clubId);

  if (!canKick(actor.rank, member.rank)) {
    throw new Error("You do not have permission to kick this member.");
  }

  const { supabase } = await getAuthedContext();

  const { error } = await supabase
    .from("club_members")
    .delete()
    .eq("id", member.id)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(error.message);
  }

  await logClubAction({
    clubId,
    action: "member_kicked",
    actorId: actor.user_id,
    targetUserId: member.user_id,
    details: {
      target_rank: member.rank,
    },
  });
}

export async function muteMember(
  clubId: string,
  actorRank: ClubRank,
  member: ClubMember,
) {
  const actor = await getActorMember(clubId);

  if (!canMute(actor.rank, member.rank)) {
    throw new Error("You do not have permission to mute this member.");
  }

  const { supabase } = await getAuthedContext();

  const { error } = await supabase
    .from("club_members")
    .update({ muted: true })
    .eq("id", member.id)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(error.message);
  }

  await logClubAction({
    clubId,
    action: "member_muted",
    actorId: actor.user_id,
    targetUserId: member.user_id,
    details: {
      target_rank: member.rank,
    },
  });
}

export async function unmuteMember(
  clubId: string,
  actorRank: ClubRank,
  member: ClubMember,
) {
  const actor = await getActorMember(clubId);

  if (!canMute(actor.rank, member.rank)) {
    throw new Error("You do not have permission to unmute this member.");
  }

  const { supabase } = await getAuthedContext();

  const { error } = await supabase
    .from("club_members")
    .update({ muted: false })
    .eq("id", member.id)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(error.message);
  }

  await logClubAction({
    clubId,
    action: "member_unmuted",
    actorId: actor.user_id,
    targetUserId: member.user_id,
    details: {
      target_rank: member.rank,
    },
  });
}

export async function transferLeadership(
  clubId: string,
  actorRank: ClubRank,
  currentLeader: ClubMember,
  newLeader: ClubMember,
) {
  const actor = await getActorMember(clubId);

  if (!canTransferLeadership(actor.rank)) {
    throw new Error("Only the current leader can transfer leadership.");
  }

  const { supabase } = await getAuthedContext();

  const stepDown = await supabase
    .from("club_members")
    .update({ rank: "co_leader" })
    .eq("id", currentLeader.id)
    .eq("club_id", clubId);

  if (stepDown.error) {
    throw new Error(stepDown.error.message);
  }

  const stepUp = await supabase
    .from("club_members")
    .update({ rank: "leader" })
    .eq("id", newLeader.id)
    .eq("club_id", clubId);

  if (stepUp.error) {
    throw new Error(stepUp.error.message);
  }

  await logClubAction({
    clubId,
    action: "leadership_transferred",
    actorId: actor.user_id,
    targetUserId: newLeader.user_id,
    details: {
      old_leader_id: currentLeader.user_id,
      old_leader_rank: currentLeader.rank,
      new_leader_id: newLeader.user_id,
      new_leader_rank: newLeader.rank,
    },
  });
}

export async function createThread(
  clubId: string,
  title: string,
  body: string,
  imageUrl: string | null = null,
): Promise<ClubThread> {
  const actor = await getActorMember(clubId);

  if (!canCreateThread(actor)) {
    throw new Error("You do not have permission to create threads.");
  }

  const { supabase } = await getAuthedContext();

  const text = title.trim();
  const content = body.trim();
  const image = imageUrl?.trim() ?? "";

  if (!text) {
    throw new Error("Thread title cannot be empty.");
  }

  if (!content && !image) {
    throw new Error("Thread body or image is required.");
  }

  const { data, error } = await supabase
    .from("club_threads")
    .insert({
      club_id: clubId,
      author_id: actor.user_id,
      title: text,
      body: content,
      image_url: image || null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const created = data as ClubThread;

  await logClubAction({
    clubId,
    action: "thread_created",
    actorId: actor.user_id,
    targetUserId: actor.user_id,
    details: {
      thread_id: created.id,
      title: created.title,
      has_image: Boolean(image),
    },
  });

  const club = await getClub(clubId);
  if (club) {
    revalidatePath(`/social/clubs/${club.title_search}/forum`);
  }

  return created;
}

export async function postComment(
  clubId: string,
  body: string,
  threadId: string | null = null,
  imageUrl: string | null = null,
): Promise<ClubComment> {
  const actor = await getActorMember(clubId);

  if (!canComment(actor)) {
    throw new Error("You do not have permission to comment.");
  }

  const { supabase } = await getAuthedContext();

  const text = body.trim();
  const image = imageUrl?.trim() ?? "";

  if (!text && !image) {
    throw new Error("Comment body or image is required.");
  }

  const { data, error } = await supabase
    .from("club_comments")
    .insert({
      club_id: clubId,
      thread_id: threadId,
      author_id: actor.user_id,
       body: text,
      image_url: image || null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  const created = data as ClubComment;

  await logClubAction({
    clubId,
    action: "comment_posted",
    actorId: actor.user_id,
    targetUserId: actor.user_id,
    details: {
      thread_id: threadId,
      comment_id: created.id,
      has_image: Boolean(image),
    },
  });

  const club = await getClub(clubId);
  if (club) {
    revalidatePath(`/social/clubs/${club.title_search}/forum`);
    if (threadId) {
      revalidatePath(`/social/clubs/${club.title_search}/forum/${threadId}`);
    }
  }

  return created;
}

export async function leaveClub(clubId: string) {
  const { supabase, user } = await getAuthedContext();

  const { data: member, error: memberError } = await supabase
    .from("club_members")
    .select("*")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (memberError) {
    throw new Error(memberError.message);
  }

  if (!member) {
    throw new Error("You are not a member of this club.");
  }

  const club = await getClub(clubId);

  if (!club) {
    throw new Error("Club not found.");
  }

  const deleteCurrentMember = async () => {
    const { error } = await supabase
      .from("club_members")
      .delete()
      .eq("id", member.id)
      .eq("club_id", clubId);

    if (error) {
      throw new Error(error.message);
    }
  };

  if (member.rank === "leader") {
    const { data: otherMembers, error: othersError } = await supabase
      .from("club_members")
      .select("*")
      .eq("club_id", clubId)
      .neq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (othersError) {
      throw new Error(othersError.message);
    }

    const members = (otherMembers ?? []) as ClubMember[];

    const rankPriority: ClubRank[] = [
      "co_leader",
      "senior_admin",
      "admin",
      "coordinator",
      "member",
    ];

    let successor: ClubMember | null = null;

    for (const rank of rankPriority) {
      successor = members.find((row) => row.rank === rank) ?? null;
      if (successor) break;
    }

    if (!successor) {
      const { error: disbandError } = await supabase
        .from("clubs")
        .update({ disbanded_at: new Date().toISOString() })
        .eq("id", clubId);

      if (disbandError) {
        throw new Error(disbandError.message);
      }

      await deleteCurrentMember();

      await logClubAction({
        clubId,
        action: "club_disbanded",
        actorId: user.id,
        details: {
          reason: "leader_left_and_no_successor",
        },
      });

      revalidatePath("/social/clubs");
      return { status: "disbanded" as const };
    }

    const { error: promoteError } = await supabase
      .from("club_members")
      .update({ rank: "leader" })
      .eq("id", successor.id)
      .eq("club_id", clubId);

    if (promoteError) {
      throw new Error(promoteError.message);
    }

    await deleteCurrentMember();

    await logClubAction({
      clubId,
      action: "leadership_transferred",
      actorId: user.id,
      targetUserId: successor.user_id,
      details: {
        from_rank: "leader",
        to_rank: "leader",
        reason: "leader_left",
      },
    });

    revalidatePath(`/social/clubs/${club.title_search}`);
    revalidatePath("/social/clubs");

    return {
      status: "left" as const,
      new_leader_id: successor.user_id,
    };
  }

  await deleteCurrentMember();

  await logClubAction({
    clubId,
    action: "member_left",
    actorId: user.id,
    details: {
      rank: member.rank,
    },
  });

  revalidatePath(`/social/clubs/${club.title_search}`);
  revalidatePath("/social/clubs");

  return { status: "left" as const };
}