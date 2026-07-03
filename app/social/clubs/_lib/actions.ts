import { supabase } from "./supabase";
import type { ClubMemberRecord, ClubRank } from "./types";
import {
  canDeleteComment,
  canDeleteThread,
  canDisbandClub,
  canKick,
  canMute,
  canPromote,
  canTransferLeadership,
} from "./permissions";

export async function getCurrentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function getMyMembership(clubId: string) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("club_members")
    .select("id, club_id, user_id, rank, muted, created_at")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ClubMemberRecord | null) ?? null;
}

export async function getMyClubRank(clubId: string): Promise<ClubRank | null> {
  const membership = await getMyMembership(clubId);
  return membership?.rank ?? null;
}

export async function promoteMember(
  clubId: string,
  actorRank: ClubRank,
  member: ClubMemberRecord,
  nextRank: ClubRank,
) {
  if (!canPromote(actorRank, member.rank)) {
    throw new Error("You do not have permission to promote this member.");
  }

  const { error } = await supabase
    .from("club_members")
    .update({ rank: nextRank })
    .eq("id", member.id)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function demoteMember(
  clubId: string,
  actorRank: ClubRank,
  member: ClubMemberRecord,
  nextRank: ClubRank,
) {
  if (!canPromote(actorRank, member.rank)) {
    throw new Error("You do not have permission to demote this member.");
  }

  const { error } = await supabase
    .from("club_members")
    .update({ rank: nextRank })
    .eq("id", member.id)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function kickMember(
  clubId: string,
  actorRank: ClubRank,
  member: ClubMemberRecord,
) {
  if (!canKick(actorRank, member.rank)) {
    throw new Error("You do not have permission to kick this member.");
  }

  const { error } = await supabase
    .from("club_members")
    .delete()
    .eq("id", member.id)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function muteMember(
  clubId: string,
  actorRank: ClubRank,
  member: ClubMemberRecord,
) {
  if (!canMute(actorRank, member.rank)) {
    throw new Error("You do not have permission to mute this member.");
  }

  const { error } = await supabase
    .from("club_members")
    .update({ muted: true })
    .eq("id", member.id)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function unmuteMember(
  clubId: string,
  actorRank: ClubRank,
  member: ClubMemberRecord,
) {
  if (!canMute(actorRank, member.rank)) {
    throw new Error("You do not have permission to unmute this member.");
  }

  const { error } = await supabase
    .from("club_members")
    .update({ muted: false })
    .eq("id", member.id)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function transferLeadership(
  clubId: string,
  actorRank: ClubRank,
  currentLeader: ClubMemberRecord,
  newLeader: ClubMemberRecord,
) {
  if (!canTransferLeadership(actorRank)) {
    throw new Error("Only the current Leader can transfer leadership.");
  }

  const stepDown = await supabase
    .from("club_members")
    .update({ rank: "co-leader" })
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
}

export async function disbandClub(clubId: string, actorRank: ClubRank) {
  if (!canDisbandClub(actorRank)) {
    throw new Error("Only the Leader can disband the club.");
  }

  const { error } = await supabase
    .from("clubs")
    .update({ disbanded_at: new Date().toISOString() })
    .eq("id", clubId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function createThread(
  clubId: string,
  title: string,
  authorId: string | null,
) {
  const { error } = await supabase.from("club_threads").insert({
    club_id: clubId,
    title,
    author_id: authorId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function postComment(
  clubId: string,
  body: string,
  authorId: string | null,
) {
  const { error } = await supabase.from("club_comments").insert({
    club_id: clubId,
    body,
    author_id: authorId,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteThread(
  clubId: string,
  actorRank: ClubRank,
  threadId: string,
) {
  if (!canDeleteThread(actorRank)) {
    throw new Error("You do not have permission to delete threads.");
  }

  const { error } = await supabase
    .from("club_threads")
    .delete()
    .eq("id", threadId)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteComment(
  clubId: string,
  actorRank: ClubRank,
  commentId: string,
) {
  if (!canDeleteComment(actorRank)) {
    throw new Error("You do not have permission to delete comments.");
  }

  const { error } = await supabase
    .from("club_comments")
    .delete()
    .eq("id", commentId)
    .eq("club_id", clubId);

  if (error) {
    throw new Error(error.message);
  }
}