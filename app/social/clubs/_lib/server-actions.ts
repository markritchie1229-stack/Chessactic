"use server";

import { createSupabaseServerClient } from "./supabase-server";
import { logClubAction } from "./audit";
import {
  canComment,
  canCreateThread,
  canDisbandClub,
  canKick,
  canMute,
  canOpenSettings,
  canPromote,
  canTransferLeadership,
} from "./permissions";
import type {
  Club,
  ClubComment,
  ClubMember,
  ClubRank,
  ClubThread,
} from "./types";

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

export async function getMyClubRankServer(
  clubId: string,
): Promise<ClubRank | null> {
  const member = await getActorMember(clubId);
  return member.rank;
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

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .insert({
      title,
      title_search: title.toLowerCase(),
      description: normalize(input.description),
      avatar_url: normalize(input.avatarUrl),
      banner_url: normalize(input.bannerUrl),
      created_by: user.id,
    })
    .select("*")
    .single();

  if (clubError) {
    throw new Error(clubError.message);
  }

  const createdClub = club as Club;

  const { error: memberError } = await supabase.from("club_members").insert({
    club_id: createdClub.id,
    user_id: user.id,
    rank: "leader",
    muted: false,
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  await logClubAction({
    clubId: createdClub.id,
    action: "club_created",
    actorId: user.id,
    details: {
      title: createdClub.title,
    },
  });

  return createdClub;
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
) {
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
      title_search: title.toLowerCase(),
      description: normalize(input.description),
      avatar_url: normalize(input.avatarUrl),
      banner_url: normalize(input.bannerUrl),
    })
    .eq("id", clubId);

  if (error) {
    throw new Error(error.message);
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
): Promise<ClubThread> {
  const actor = await getActorMember(clubId);

  if (!canCreateThread(actor)) {
    throw new Error("You do not have permission to create threads.");
  }

  const { supabase } = await getAuthedContext();

  const text = title.trim();
  const content = body.trim();

  if (!text) {
    throw new Error("Thread title cannot be empty.");
  }

  if (!content) {
    throw new Error("Thread body cannot be empty.");
  }

  const { data, error } = await supabase
    .from("club_threads")
    .insert({
      club_id: clubId,
      author_id: actor.user_id,
      title: text,
      body: content,
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
    },
  });

  return created;
}

export async function postComment(
  clubId: string,
  body: string,
  threadId: string | null = null,
): Promise<ClubComment> {
  const actor = await getActorMember(clubId);

  if (!canComment(actor)) {
    throw new Error("You do not have permission to comment.");
  }

  const { supabase } = await getAuthedContext();

  const text = body.trim();

  if (!text) {
    throw new Error("Comment body cannot be empty.");
  }

  const { data, error } = await supabase
    .from("club_comments")
    .insert({
      club_id: clubId,
      thread_id: threadId,
      author_id: actor.user_id,
      body: text,
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
    },
  });

  return created;
}