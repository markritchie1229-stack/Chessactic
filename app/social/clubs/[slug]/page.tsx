import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import {
  ArrowLeft,
  BadgeInfo,
  Hash,
  MessageSquare,
  Settings2,
  Shield,
  UserPlus,
  Users,
} from "lucide-react";

type ClubPageProps = {
  params: {
    slug: string;
  };
};

type ClubRecord = {
  id: string;
  title: string;
  title_search: string;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  created_by: string | null;
  disbanded_at: string | null;
  created_at: string;
  updated_at: string;
};

type ClubMemberRecord = {
  id: string;
  club_id: string;
  user_id: string;
  rank: string;
  muted: boolean | null;
  created_at: string | null;
};

type ProfileRecord = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type CommentRecord = {
  id: string;
  club_id: string;
  author_id: string | null;
  body: string;
  created_at: string | null;
};

type ThreadRecord = {
  id: string;
  club_id: string;
  author_id: string | null;
  title: string;
  created_at: string | null;
};

type RankedGroup = {
  rank: string;
  members: Array<{
    member: ClubMemberRecord;
    profile: ProfileRecord | undefined;
  }>;
};

const RANK_ORDER = ["Leader", "Co-Leader", "Senior Admin", "Admin", "Coordinator", "Member"];

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

async function getClubBySlug(slug: string): Promise<ClubRecord | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("clubs")
    .select("id, title, title_search, description, avatar_url, banner_url, created_by, disbanded_at, created_at, updated_at")
    .eq("title_search", slug)
    .is("disbanded_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ?? null;
}

async function getClubMembers(clubId: string): Promise<ClubMemberRecord[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("club_members")
    .select("id, club_id, user_id, rank, muted, created_at")
    .eq("club_id", clubId)
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ClubMemberRecord[];
}

async function getProfiles(userIds: string[]): Promise<Map<string, ProfileRecord>> {
  const supabase = getSupabaseClient();

  if (userIds.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.from("profiles").select("id, username, avatar_url").in("id", userIds);

  if (error) {
    return new Map();
  }

  const map = new Map<string, ProfileRecord>();
  (data ?? []).forEach((profile) => {
    map.set(profile.id, profile as ProfileRecord);
  });
  return map;
}

async function getRecentComments(clubId: string): Promise<CommentRecord[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("club_comments")
    .select("id, club_id, author_id, body, created_at")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CommentRecord[];
}

async function getRecentThreads(clubId: string): Promise<ThreadRecord[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("club_threads")
    .select("id, club_id, author_id, title, created_at")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .limit(3);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ThreadRecord[];
}

function groupMembersByRank(members: ClubMemberRecord[], profiles: Map<string, ProfileRecord>) {
  const grouped = new Map<string, RankedGroup>();

  RANK_ORDER.forEach((rank) => {
    grouped.set(rank, { rank, members: [] });
  });

  members.forEach((member) => {
    const group = grouped.get(member.rank) ?? { rank: member.rank, members: [] };
    group.members.push({ member, profile: profiles.get(member.user_id) });
    grouped.set(member.rank, group);
  });

  return RANK_ORDER.flatMap((rank) => {
    const group = grouped.get(rank);
    return group && group.members.length > 0 ? [group] : [];
  });
}

function EmptyClubState({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href="/social/clubs"
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to clubs
        </Link>

        <div className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl shadow-black/20">
          <h1 className="text-3xl font-semibold">Club not found</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            No active club matched the slug “{slug}”.
          </p>
        </div>
      </div>
    </div>
  );
}

export default async function ClubPage({ params }: ClubPageProps) {
  const club = await getClubBySlug(params.slug);

  if (!club) {
    return <EmptyClubState slug={params.slug} />;
  }

  const base = `/social/clubs/${club.title_search}`;
  const [members, recentComments, recentThreads] = await Promise.all([
    getClubMembers(club.id),
    getRecentComments(club.id),
    getRecentThreads(club.id),
  ]);
  const profiles = await getProfiles(members.map((member) => member.user_id));
  const groupedMembers = groupMembersByRank(members, profiles);
  const backgroundStyle = club.banner_url ? { backgroundImage: `url(${club.banner_url})` } : undefined;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="min-h-screen bg-cover bg-center bg-no-repeat" style={backgroundStyle}>
        <div className="min-h-screen bg-slate-950/80">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <Link
                href="/social/clubs"
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900/90 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to clubs
              </Link>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/85 p-3 shadow-lg shadow-black/20">
                <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  Quick links
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                  <Link href={`${base}/members`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800">
                    <Users className="h-4 w-4" />
                    Members
                  </Link>
                  <Link href={`${base}/invite`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800">
                    <UserPlus className="h-4 w-4" />
                    Invite
                  </Link>
                  <Link href={`${base}/forum`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800">
                    <BadgeInfo className="h-4 w-4" />
                    Forum
                  </Link>
                  <Link href={`${base}/settings`} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800">
                    <Settings2 className="h-4 w-4" />
                    Settings
                  </Link>
                </div>
              </div>
            </div>

            <header className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/20">
              <div className="p-6 sm:p-8">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <div className="text-sm uppercase tracking-[0.28em] text-slate-400">Club page</div>
                    <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{club.title}</h1>
                    <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
                      {club.description?.trim() || "This club does not have a description yet."}
                    </p>
                  </div>

                  {club.avatar_url ? (
                    <img
                      src={club.avatar_url}
                      alt={club.title}
                      className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-700"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-950 text-slate-400 ring-1 ring-slate-700">
                      <Shield className="h-6 w-6" />
                    </div>
                  )}
                </div>
              </div>
            </header>

            <div className="mt-6 flex flex-col gap-6 lg:flex-row">
              <main className="flex-1 space-y-6">
                <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="relative flex-1">
                      <div className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <textarea
                        rows={3}
                        placeholder="Type a club comment..."
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 py-3 pl-11 pr-4 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-950">
                      Post comment
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {recentComments.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
                        No comments yet.
                      </div>
                    ) : (
                      recentComments.map((comment) => (
                        <div
                          key={comment.id}
                          className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300"
                        >
                          {comment.body}
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
                  <div className="mb-4 flex items-center gap-3">
                    <Hash className="h-5 w-5 text-cyan-400" />
                    <div>
                      <h2 className="text-xl font-semibold">Recent threads</h2>
                      <p className="text-sm text-slate-400">
                        The three most recently commented-on threads show below the chat.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    {recentThreads.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400 md:col-span-3">
                        No threads yet.
                      </div>
                    ) : (
                      recentThreads.map((thread) => (
                        <div
                          key={thread.id}
                          className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                        >
                          <div className="font-medium text-slate-100">{thread.title}</div>
                          <div className="mt-2 text-sm leading-6 text-slate-400">
                            Recently commented on by club members.
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </main>

              <aside className="space-y-6">
                <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
                  <div className="mb-4 flex items-center gap-3">
                    <Users className="h-5 w-5 text-cyan-400" />
                    <div>
                      <h2 className="text-xl font-semibold">Ranked profiles</h2>
                      <p className="text-sm text-slate-400">
                        Coordinator and above appear in rows by rank.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {groupedMembers.length === 0 ? (
                      <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
                        No members are in this club yet.
                      </div>
                    ) : (
                      groupedMembers.map((group) => (
                        <div key={group.rank}>
                          <div className="mb-2 text-xs uppercase tracking-[0.22em] text-slate-500">
                            {group.rank}
                          </div>
                          <div className="flex flex-wrap gap-3">
                            {group.members.map(({ member, profile }) => {
                              const label = profile?.username ?? member.user_id;
                              const initials = label.slice(0, 2).toUpperCase();
                              const profileHref = `/profile/${profile?.id ?? member.user_id}`;

                              return (
                                <Link
                                  key={member.id}
                                  href={profileHref}
                                  className="flex flex-col items-center gap-2"
                                >
                                  {profile?.avatar_url ? (
                                    <img
                                      src={profile.avatar_url}
                                      alt={label}
                                      className="h-12 w-12 rounded-2xl object-cover ring-1 ring-slate-700 transition hover:ring-cyan-500"
                                    />
                                  ) : (
                                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-sm font-semibold text-slate-200 transition hover:border-cyan-500 hover:text-cyan-300">
                                      {initials}
                                    </div>
                                  )}
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
                  <div className="mb-4 flex items-center gap-3">
                    <Shield className="h-5 w-5 text-cyan-400" />
                    <div>
                      <h2 className="text-xl font-semibold">Club status</h2>
                      <p className="text-sm text-slate-400">Leader and moderator controls will go here.</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm text-slate-300">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      Leader: full control over club settings, moderation, rank changes, and disbanding.
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      Co-Leader, Senior Admin, Admin, Coordinator, and Member roles will be wired next.
                    </div>
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
