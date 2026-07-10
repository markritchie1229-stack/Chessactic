"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "@/lib/admin";
import { createSupabaseServerClient } from "./supabase-server";
import { logClubAction } from "./audit";
import { sendSystemNotification } from "../_lib/notifications.server";

export type ModerationReport = {
  id: string;
  reporter_id: string;
  reporter_username: string | null;
  title: string | null;
  description: string;
  image_urls: string[];
  status: "open" | "resolved" | "dismissed";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
};

type SignedInContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
};

type ProfileModerationState = {
  muted_indefinitely: boolean | null;
  muted_until: string | null;
  account_status: string | null;
};

type ClubMemberRow = {
  id: string;
  user_id: string;
  rank: string;
  club_id: string;
};

async function getSignedInContext(): Promise<SignedInContext> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw new Error(error.message);
  if (!user) throw new Error("You must be signed in to do that.");

  return { supabase, userId: user.id };
}

async function requireSiteAdmin(): Promise<SignedInContext> {
  const ctx = await getSignedInContext();

  if (!isAdmin(ctx.userId)) {
    throw new Error("Only the site admin can do that.");
  }

  return ctx;
}

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

function formatMuteDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours} hour${hours === 1 ? "" : "s"} ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"}`;
  }

  if (hours > 0) {
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }

  return `${minutes} minute${minutes === 1 ? "" : "s"}`;
}

async function notifyUser(input: {
  supabase: SignedInContext["supabase"];
  senderId: string;
  recipientId: string;
  title: string;
  body: string;
}) {
  await sendSystemNotification({
    supabase: input.supabase,
    senderId: input.senderId,
    recipientId: input.recipientId,
    title: input.title,
    body: input.body,
  });
}

async function getProfileUsername(
  supabase: SignedInContext["supabase"],
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return normalizeText(data?.username ?? null) || null;
}

async function assertPostingAllowed(
  supabase: SignedInContext["supabase"],
  userId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("muted_indefinitely,muted_until,account_status")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const profile = data as ProfileModerationState | null;
  if (!profile) return;

  if (profile.account_status === "closed") {
    throw new Error("This account is closed.");
  }

  if (profile.muted_indefinitely) {
    throw new Error("You are muted.");
  }

  if (profile.muted_until) {
    const until = new Date(profile.muted_until);
    if (!Number.isNaN(until.getTime()) && until > new Date()) {
      throw new Error("You are muted.");
    }
  }
}

export async function submitModerationReport(input: {
  title?: string | null;
  description: string;
  imageUrls?: string[];
}) {
  const { supabase, userId } = await getSignedInContext();
  const description = input.description.trim();

  if (!description) {
    throw new Error("Please describe what happened.");
  }

  const imageUrls = (input.imageUrls ?? [])
    .map((value) => value.trim())
    .filter(Boolean);

  const reporterUsername = await getProfileUsername(supabase, userId);

  const { error } = await supabase.from("moderation_reports").insert({
    reporter_id: userId,
    reporter_username: reporterUsername,
    title: input.title?.trim() || null,
    description,
    image_urls: imageUrls,
    status: "open",
  });

  if (error) throw new Error(error.message);

  revalidatePath("/social/admin/moderation");
  return { status: "submitted" as const };
}

export async function getModerationReports() {
  const { supabase } = await requireSiteAdmin();

  const { data, error } = await supabase
    .from("moderation_reports")
    .select(
      "id,reporter_id,reporter_username,title,description,image_urls,status,created_at,reviewed_at,reviewed_by,review_note",
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as ModerationReport[];
}

export async function resolveModerationReport(input: {
  reportId: string;
  status: "resolved" | "dismissed";
  note?: string | null;
}) {
  const { supabase, userId } = await requireSiteAdmin();

  const { data: report, error: reportError } = await supabase
    .from("moderation_reports")
    .select("id,reporter_id,title")
    .eq("id", input.reportId)
    .maybeSingle();

  if (reportError) throw new Error(reportError.message);
  if (!report) throw new Error("Report not found.");

  const { error } = await supabase
    .from("moderation_reports")
    .update({
      status: input.status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: userId,
      review_note: input.note?.trim() || null,
    })
    .eq("id", input.reportId);

  if (error) throw new Error(error.message);

  const reportTitle = report.title?.trim() || "your report";
  const note = input.note?.trim() || "";

  await notifyUser({
    supabase,
    senderId: userId,
    recipientId: report.reporter_id,
    title: "Report update",
    body:
      input.status === "resolved"
        ? `Your report (${reportTitle}) has been resolved.${note ? `\n\nAdmin note: ${note}` : ""}`
        : `Your report (${reportTitle}) has been dismissed.${note ? `\n\nAdmin note: ${note}` : ""}`,
  });

  revalidatePath("/social/admin/moderation");
  return { status: input.status };
}

export async function searchUsersForModeration(query: string) {
  const { supabase } = await requireSiteAdmin();
  const term = query.trim();

  if (!term) return [];

  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id,username,email,avatar_url,bio,account_status,muted_until,muted_indefinitely",
    )
    .or(`username.ilike.%${term}%,email.ilike.%${term}%`)
    .order("username", { ascending: true })
    .limit(20);

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function searchClubsForModeration(query: string) {
  const { supabase } = await requireSiteAdmin();
  const term = query.trim();

  if (!term) return [];

  const { data, error } = await supabase
    .from("clubs")
    .select("id,title,title_search,disbanded_at,created_at")
    .ilike("title", `%${term}%`)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function updateClubMuteState(
  supabase: SignedInContext["supabase"],
  userId: string,
  muted: boolean,
) {
  const { error } = await supabase
    .from("club_members")
    .update({ muted })
    .eq("user_id", userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function setUserMute(input: {
  userId: string;
  muteForMinutes?: number | null;
  muteIndefinitely?: boolean;
}) {
  const { supabase, userId: adminId } = await requireSiteAdmin();

  const mutedIndefinitely = Boolean(input.muteIndefinitely);
  const muteForMinutes = input.muteForMinutes ?? 0;

  if (!mutedIndefinitely && muteForMinutes <= 0) {
    throw new Error("Provide a mute duration or choose indefinite mute.");
  }

  const mutedUntil = mutedIndefinitely
    ? null
    : new Date(Date.now() + muteForMinutes * 60_000).toISOString();

  const { data: updatedProfile, error } = await supabase
    .from("profiles")
    .update({
      muted_indefinitely: mutedIndefinitely,
      muted_until: mutedUntil,
      account_status: "active",
    })
    .eq("id", input.userId)
    .select("id, muted_indefinitely, muted_until, account_status")
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (!updatedProfile) {
    throw new Error("No profile row was updated. Check that the selected user ID matches profiles.id.");
  }

  await updateClubMuteState(supabase, input.userId, true);

  await supabase.from("moderation_actions").insert({
    target_user_id: input.userId,
    action: mutedIndefinitely ? "mute_indefinite" : "mute_timed",
    actor_user_id: adminId,
    details: {
      mute_for_minutes: mutedIndefinitely ? null : muteForMinutes,
      mute_indefinitely: mutedIndefinitely,
      muted_until: mutedUntil,
    },
  });

  revalidatePath("/social/admin/moderation");
}

export async function clearUserMute(userId: string) {
  const { supabase, userId: adminId } = await requireSiteAdmin();

  const { error } = await supabase
    .from("profiles")
    .update({ muted_indefinitely: false, muted_until: null })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  await updateClubMuteState(supabase, userId, false);

  await supabase.from("moderation_actions").insert({
    target_user_id: userId,
    action: "unmute",
    actor_user_id: adminId,
    details: {},
  });

  revalidatePath("/admin/moderation");
}
export async function closeUserAccount(userId: string) {
  const { supabase, userId: adminId } = await requireSiteAdmin();

  const { error } = await supabase
    .from("profiles")
    .update({ account_status: "closed" })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  await supabase.from("moderation_actions").insert({
    target_user_id: userId,
    action: "close_account",
    actor_user_id: adminId,
    details: {},
  });

  await notifyUser({
    supabase,
    senderId: adminId,
    recipientId: userId,
    title: "Account status update",
    body: "Your account has been closed by an admin.",
  });

  revalidatePath("/social/admin/moderation");
}

export async function openUserAccount(userId: string) {
  const { supabase, userId: adminId } = await requireSiteAdmin();

  const { error } = await supabase
    .from("profiles")
    .update({ account_status: "active" })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  await supabase.from("moderation_actions").insert({
    target_user_id: userId,
    action: "open_account",
    actor_user_id: adminId,
    details: {},
  });

  await notifyUser({
    supabase,
    senderId: adminId,
    recipientId: userId,
    title: "Account status update",
    body: "Your account has been reopened by an admin.",
  });

  revalidatePath("/social/admin/moderation");
}

export async function banUserIp(input: {
  userId: string;
  ipAddress: string;
  reason?: string | null;
}) {
  const { supabase, userId: adminId } = await requireSiteAdmin();
  const ipAddress = input.ipAddress.trim();

  if (!ipAddress) {
    throw new Error("Please provide an IP address.");
  }

  const reason = normalizeText(input.reason) || null;

  const { error } = await supabase.from("ip_bans").insert({
    target_user_id: input.userId,
    ip_address: ipAddress,
    reason,
    created_by: adminId,
  });

  if (error) throw new Error(error.message);

  await supabase.from("moderation_actions").insert({
    target_user_id: input.userId,
    action: "ip_ban",
    actor_user_id: adminId,
    details: { ip_address: ipAddress, reason },
  });

  await notifyUser({
    supabase,
    senderId: adminId,
    recipientId: input.userId,
    title: "Moderation update",
    body: reason
      ? `Your IP address has been banned by an admin.\n\nReason: ${reason}`
      : "Your IP address has been banned by an admin.",
  });

  revalidatePath("/social/admin/moderation");
}

export async function liftIpBan(input: { userId: string; ipAddress: string }) {
  const { supabase, userId: adminId } = await requireSiteAdmin();
  const ipAddress = input.ipAddress.trim();

  const { error } = await supabase
    .from("ip_bans")
    .update({ revoked_at: new Date().toISOString(), revoked_by: adminId })
    .eq("target_user_id", input.userId)
    .eq("ip_address", ipAddress)
    .is("revoked_at", null);

  if (error) throw new Error(error.message);

  await supabase.from("moderation_actions").insert({
    target_user_id: input.userId,
    action: "lift_ip_ban",
    actor_user_id: adminId,
    details: { ip_address: ipAddress },
  });

  await notifyUser({
    supabase,
    senderId: adminId,
    recipientId: input.userId,
    title: "Moderation update",
    body: "Your IP ban has been lifted by an admin.",
  });

  revalidatePath("/social/admin/moderation");
}

export async function replaceClubLeader(input: {
  clubId: string;
  newLeaderUserId: string;
}) {
  const { supabase, userId: adminId } = await requireSiteAdmin();

  const newLeaderUserId = input.newLeaderUserId.trim();
  if (!newLeaderUserId) {
    throw new Error("Please choose a new leader.");
  }

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("title")
    .eq("id", input.clubId)
    .maybeSingle();

  if (clubError) throw new Error(clubError.message);

  const clubTitle = club?.title?.trim() || "your club";

  const { data: members, error: membersError } = await supabase
    .from("club_members")
    .select("id,user_id,rank,club_id")
    .eq("club_id", input.clubId);

  if (membersError) throw new Error(membersError.message);

  const memberRows = (members ?? []) as ClubMemberRow[];
  const leader = memberRows.find((member) => member.rank === "leader") ?? null;
  const replacement =
    memberRows.find((member) => member.user_id === newLeaderUserId) ?? null;

  if (!replacement) {
    throw new Error("The selected user is not a member of that club.");
  }

  if (leader && leader.user_id === replacement.user_id) {
    return { status: "already_leader" as const };
  }

  if (leader) {
    const { error: demoteError } = await supabase
      .from("club_members")
      .update({ rank: "co_leader" })
      .eq("id", leader.id)
      .eq("club_id", input.clubId);

    if (demoteError) throw new Error(demoteError.message);
  }

  const { error: promoteError } = await supabase
    .from("club_members")
    .update({ rank: "leader" })
    .eq("id", replacement.id)
    .eq("club_id", input.clubId);

  if (promoteError) throw new Error(promoteError.message);

  await logClubAction({
    clubId: input.clubId,
    action: "leadership_transferred",
    actorId: adminId,
    targetUserId: newLeaderUserId,
    details: {
      admin_override: true,
      replacement_user_id: newLeaderUserId,
      previous_leader_user_id: leader?.user_id ?? null,
    },
  });

  if (leader?.user_id) {
    await notifyUser({
      supabase,
      senderId: adminId,
      recipientId: leader.user_id,
      title: "Club update",
      body: `Your leadership of "${clubTitle}" has been replaced by an admin.`,
    });
  }

  await notifyUser({
    supabase,
    senderId: adminId,
    recipientId: newLeaderUserId,
    title: "Club update",
    body: `You are now the leader of "${clubTitle}" after an admin override.`,
  });

  revalidatePath("/social/admin/moderation");
  revalidatePath("/social/clubs");
  return { status: "updated" as const };
}

export async function adminDisbandClub(clubId: string) {
  const { supabase, userId: adminId } = await requireSiteAdmin();

  const { data: club, error: clubError } = await supabase
    .from("clubs")
    .select("title")
    .eq("id", clubId)
    .maybeSingle();

  if (clubError) throw new Error(clubError.message);

  const { error } = await supabase
    .from("clubs")
    .update({ disbanded_at: new Date().toISOString() })
    .eq("id", clubId);

  if (error) throw new Error(error.message);

  await logClubAction({
    clubId,
    action: "club_disbanded",
    actorId: adminId,
    details: {
      admin_override: true,
    },
  });

  if (club?.title) {
    // Optional notification target is unknown without a site-wide owner table.
  }

  revalidatePath("/social/admin/moderation");
  revalidatePath("/social/clubs");
  return { status: "disbanded" as const };
}
