"use server";

import { createSupabaseServerClient } from "./supabase-server";

export type ClubAuditAction =
  | "club_created"
  | "club_updated"
  | "club_disbanded"
  | "member_joined"
  | "member_left"
  | "member_kicked"
  | "member_muted"
  | "member_unmuted"
  | "member_promoted"
  | "member_demoted"
  | "leadership_transferred"
  | "thread_created"
  | "thread_deleted"
  | "comment_posted"
  | "comment_deleted"
  | "invite_sent"
  | "invite_accepted"
  | "invite_declined"
  | "join_requested"
  | "join_request_approved"
  | "join_request_declined";

export type ClubAuditDetails = Record<string, unknown>;

type AuditInput = {
  clubId: string;
  action: ClubAuditAction;
  actorId: string;
  targetUserId?: string | null;
  details?: ClubAuditDetails;
};

export async function logClubAction({
  clubId,
  action,
  actorId,
  targetUserId = null,
  details = {},
}: AuditInput) {
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("club_audit_log").insert({
    club_id: clubId,
    action,
    actor_id: actorId,
    target_user_id: targetUserId,
    details,
  });

  if (error) {
    throw new Error(error.message);
  }
}