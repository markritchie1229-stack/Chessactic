import "server-only";

import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "./supabase-server";
import type {
  Club,
  ClubComment,
  ClubMember,
  ClubRank,
  ClubThread,
  Profile,
} from "./types";

export async function getClubBySlug(
  slug: string,
): Promise<Club | null> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("clubs")
    .select("*")
    .eq("title_search", slug)
    .is("disbanded_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Club | null) ?? null;
}

export async function requireClubBySlug(slug: string): Promise<Club> {
  const club = await getClubBySlug(slug);

  if (!club) {
    notFound();
  }

  return club;
}

export async function getActiveClubs(): Promise<Club[]> {
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("clubs")
    .select("*")
    .is("disbanded_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Club[];
}

export async function getClubMembers(
  clubId: string,
): Promise<ClubMember[]> {
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

export async function getCurrentMember(
  clubId: string,
): Promise<ClubMember | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
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

export async function getCurrentRank(
  clubId: string,
): Promise<ClubRank | null> {
  const member = await getCurrentMember(clubId);
  return member?.rank ?? null;
}

export async function getProfiles(
  userIds: string[],
): Promise<Map<string, Profile>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  if (error) {
    throw new Error(error.message);
  }

  const profiles = new Map<string, Profile>();

  (data ?? []).forEach((profile) => {
    profiles.set(profile.id, profile as Profile);
  });

  return profiles;
}

export async function getThreads(
  clubId: string,
): Promise<ClubThread[]> {
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

export async function getThreadById(
  threadId: string,
): Promise<ClubThread | null> {
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

export async function getComments(
  clubId: string,
): Promise<ClubComment[]> {
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

export async function getThreadComments(
  threadId: string,
): Promise<ClubComment[]> {
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