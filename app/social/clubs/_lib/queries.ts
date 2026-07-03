import { supabase } from "./supabase";
import type {
  ClubMemberRecord,
  ClubRecord,
  CommentRecord,
  ProfileRecord,
  ThreadRecord,
} from "./types";

export async function getClubBySlug(
  slug: string,
): Promise<ClubRecord | null> {
  const { data, error } = await supabase
    .from("clubs")
    .select(
      "id, title, title_search, description, avatar_url, banner_url, created_by, disbanded_at, created_at, updated_at",
    )
    .eq("title_search", slug)
    .is("disbanded_at", null)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data ?? null;
}

export async function getActiveClubs(): Promise<ClubRecord[]> {
  const { data, error } = await supabase
    .from("clubs")
    .select(
      "id, title, title_search, description, avatar_url, banner_url, created_by, disbanded_at, created_at, updated_at",
    )
    .is("disbanded_at", null)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as ClubRecord[];
}

export async function searchClubs(
  query: string,
): Promise<ClubRecord[]> {
  const term = query.trim();

  let request = supabase
    .from("clubs")
    .select(
      "id, title, title_search, description, avatar_url, banner_url, created_by, disbanded_at, created_at, updated_at",
    )
    .is("disbanded_at", null)
    .order("created_at", { ascending: false });

  if (term) {
    request = request.or(
      `title.ilike.%${term}%,description.ilike.%${term}%,title_search.ilike.%${term}%`,
    );
  }

  const { data, error } = await request;

  if (error) throw new Error(error.message);

  return (data ?? []) as ClubRecord[];
}

export async function getClubMembers(
  clubId: string,
): Promise<ClubMemberRecord[]> {
  const { data, error } = await supabase
    .from("club_members")
    .select("id, club_id, user_id, rank, muted, created_at")
    .eq("club_id", clubId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []) as ClubMemberRecord[];
}

export async function getProfiles(
  userIds: string[],
): Promise<Map<string, ProfileRecord>> {
  if (userIds.length === 0) return new Map();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, last_seen, bio")
    .in("id", userIds);

  if (error) return new Map();

  const map = new Map<string, ProfileRecord>();

  (data ?? []).forEach((profile) => {
    map.set(profile.id, profile as ProfileRecord);
  });

  return map;
}

export async function getRecentComments(
  clubId: string,
): Promise<CommentRecord[]> {
  const { data, error } = await supabase
    .from("club_comments")
    .select("id, club_id, author_id, body, created_at")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) throw new Error(error.message);

  return (data ?? []) as CommentRecord[];
}

export async function getRecentThreads(
  clubId: string,
): Promise<ThreadRecord[]> {
  const { data, error } = await supabase
    .from("club_threads")
    .select("id, club_id, author_id, title, created_at")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) throw new Error(error.message);

  return (data ?? []) as ThreadRecord[];
}

export async function getClubThreads(
  clubId: string,
): Promise<ThreadRecord[]> {
  const { data, error } = await supabase
    .from("club_threads")
    .select("id, club_id, author_id, title, created_at")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []) as ThreadRecord[];
}