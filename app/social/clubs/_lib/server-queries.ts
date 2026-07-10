import "server-only";
import { makeSiteAdminMember } from "./effective-member";
import { isAdmin } from "@/lib/admin";
import { createSupabaseServerClient } from "./supabase-server";
import type {
  Club,
  ClubComment,
  ClubMember,
  ClubRank,
  ClubThread,
  Profile,
} from "./types";

type ClubHeaderStats = {
  totalMembers: number;
  activeMembers: number;
};

type ClubDailyActivityRow = {
  user_id: string;
  activity_date: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function utcDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function utcDateFromKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function startOfUtcDay(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

async function getRecentJoiners(clubId: string, sinceIso: string) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("club_members")
    .select("user_id")
    .eq("club_id", clubId)
    .gte("created_at", sinceIso);

  if (error) {
    throw new Error(error.message);
  }

  return new Set((data ?? []).map((row) => row.user_id));
}

async function getClubActivityRowsSince(
  clubId: string,
  startDateKey: string,
  endDateKey: string,
) {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("club_daily_activity")
    .select("user_id, activity_date")
    .eq("club_id", clubId)
    .gte("activity_date", startDateKey)
    .lte("activity_date", endDateKey);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ClubDailyActivityRow[];
}

export async function recordClubActivity(clubId: string) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("club_members")
    .select("id")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    throw new Error(membershipError.message);
  }

  if (!membership) {
    return;
  }

  const activityDate = utcDateKey(new Date());

  const { error } = await supabase.from("club_daily_activity").upsert(
    {
      club_id: clubId,
      user_id: user.id,
      activity_date: activityDate,
    },
    {
      onConflict: "club_id,user_id,activity_date",
    },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function getClubBySlug(slug: string): Promise<Club | null> {
  const supabase = await createSupabaseServerClient();

  const rawSlug = slug.trim();
  if (!rawSlug) {
    return null;
  }

  const titleLike = rawSlug.replace(/-/g, " ");

  const attempts = [
    rawSlug,
    rawSlug.toLowerCase(),
    titleLike,
    titleLike.toLowerCase(),
  ];

  for (const candidate of attempts) {
    const { data, error } = await supabase
      .from("clubs")
      .select("*")
      .eq("title_search", candidate)
      .is("disbanded_at", null)
      .limit(2);

    if (error) {
      throw new Error(error.message);
    }

    const clubs = (data ?? []) as Club[];

    if (clubs.length === 1) {
      return clubs[0];
    }

    if (clubs.length > 1) {
      const exact = clubs.find((club) => club.title_search === candidate) ?? clubs[0];
      return exact;
    }
  }

  const { data, error } = await supabase
    .from("clubs")
    .select("*")
    .ilike("title", `%${titleLike}%`)
    .is("disbanded_at", null)
    .order("created_at", { ascending: false })
    .limit(2);

  if (error) {
    throw new Error(error.message);
  }

  const clubs = (data ?? []) as Club[];

  if (clubs.length === 0) {
    return null;
  }

  if (clubs.length === 1) {
    return clubs[0];
  }

  const exactTitle =
    clubs.find((club) => club.title.trim().toLowerCase() === titleLike.toLowerCase()) ??
    clubs[0];

  return exactTitle;
}

export async function getActiveClubs(query?: string): Promise<Club[]> {
  const supabase = await createSupabaseServerClient();
  const trimmedQuery = query?.trim();

  let request = supabase.from("clubs").select("*").is("disbanded_at", null);

  if (trimmedQuery) {
    request = request.ilike("title", `%${trimmedQuery}%`);
  }

  const { data, error } = await request.order("created_at", {
    ascending: false,
  });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Club[];
}

export async function getClubHeaderStats(
  clubId: string,
): Promise<ClubHeaderStats> {
  const supabase = await createSupabaseServerClient();

  const today = new Date();

  const startDate = new Date(today);
  startDate.setHours(0, 0, 0, 0);
  startDate.setDate(startDate.getDate() - 6);

  const startIso = startDate.toISOString().slice(0, 10);

  const [{ count: totalMembers }, { data: newMembers }, { data: activity }] =
    await Promise.all([
      supabase
        .from("club_members")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId),

      supabase
        .from("club_members")
        .select("user_id")
        .eq("club_id", clubId)
        .gte("created_at", startDate.toISOString()),

      supabase
        .from("club_daily_activity")
        .select("user_id, activity_date")
        .eq("club_id", clubId)
        .gte("activity_date", startIso),
    ]);

  const recentJoiners = new Set(
    (newMembers ?? []).map((m) => m.user_id),
  );

  const dailyCounts = new Map<string, Set<string>>();

  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(startDate.getDate() + i);

    dailyCounts.set(
      d.toISOString().slice(0, 10),
      new Set(),
    );
  }

  for (const row of activity ?? []) {
    if (recentJoiners.has(row.user_id)) continue;

    dailyCounts.get(row.activity_date)?.add(row.user_id);
  }

  const average =
    Array.from(dailyCounts.values())
      .reduce((sum, users) => sum + users.size, 0) / 7;

  return {
    totalMembers: totalMembers ?? 0,
    activeMembers: Math.round(average),
  };
}

export async function getClubMembers(clubId: string): Promise<ClubMember[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("club_members")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ClubMember[];
}

function makeAdminMember(clubId: string, userId: string): ClubMember {
  return {
    id: `site-admin-${clubId}`,
    club_id: clubId,
    user_id: userId,
    rank: "leader",
    muted: false,
    created_at: null,
  };
}

export async function getCurrentMember(clubId: string): Promise<ClubMember | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  if (isAdmin(user.id)) {
  return makeSiteAdminMember(clubId, user.id);
}

  const { data, error } = await supabase
    .from("club_members")
    .select("*")
    .eq("club_id", clubId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ClubMember | null) ?? null;
}

export async function getCurrentRank(clubId: string): Promise<ClubRank | null> {
  const member = await getCurrentMember(clubId);
  return member?.rank ?? null;
}

export async function getProfiles(userIds: string[]): Promise<Map<string, Profile>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.from("profiles").select("*").in("id", userIds);

  if (error) {
    throw new Error(error.message);
  }

  const profiles = new Map<string, Profile>();

  (data ?? []).forEach((profile) => {
    profiles.set(profile.id, profile as Profile);
  });

  return profiles;
}

export async function getThreads(clubId: string): Promise<ClubThread[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("club_threads")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ClubThread[];
}

export async function getRecentThreads(
  clubId: string,
  limit = 5,
): Promise<ClubThread[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("club_threads")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ClubThread[];
}

export async function getThreadById(threadId: string): Promise<ClubThread | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("club_threads")
    .select("*")
    .eq("id", threadId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ClubThread | null) ?? null;
}

export async function getComments(clubId: string): Promise<ClubComment[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("club_comments")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ClubComment[];
}

export async function getRecentComments(
  clubId: string,
  limit = 20,
): Promise<ClubComment[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("club_comments")
    .select("*")
    .eq("club_id", clubId)
    .is("thread_id", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ClubComment[];
}

export async function getThreadComments(threadId: string): Promise<ClubComment[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("club_comments")
    .select("*")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ClubComment[];
}
