import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Search, Shield, Users } from "lucide-react";

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

  if (userIds.length === 0) return new Map();

  try {
    const { data, error } = await supabase.from("profiles").select("id, username, avatar_url").in("id", userIds);

    if (error) return new Map();

    const map = new Map<string, ProfileRecord>();
    (data ?? []).forEach((profile) => {
      map.set(profile.id, profile as ProfileRecord);
    });
    return map;
  } catch {
    return new Map();
  }
}

function formatJoinDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default async function ClubMembersPage({ params }: ClubPageProps) {
  const club = await getClubBySlug(params.slug);

  if (!club) {
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
              This members page could not find an active club for the slug in the URL.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const base = `/social/clubs/${club.title_search}`;
  const members = await getClubMembers(club.id);
  const profiles = await getProfiles(members.map((member) => member.user_id));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href={base}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to club
          </Link>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/85 p-3 shadow-lg shadow-black/20">
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              Quick links
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
              <Link href={`${base}/members`} className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950">
                Members
              </Link>
              <Link href={`${base}/invite`} className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800">
                Invite
              </Link>
              <Link href={`${base}/forum`} className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800">
                Forum
              </Link>
              <Link href={`${base}/settings`} className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800">
                Settings
              </Link>
            </div>
          </div>
        </div>

        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="text-sm uppercase tracking-[0.28em] text-slate-400">Members</div>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{club.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Search members and manage promotions, demotions, kicks, mutes, and unmute actions from here.
          </p>
        </header>

        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-cyan-400" />
              <div>
                <h2 className="text-xl font-semibold">Member roster</h2>
                <p className="text-sm text-slate-400">Search by username to make browsing easier.</p>
              </div>
            </div>
            <div className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
              {members.length} members
            </div>
          </div>

          <div className="relative mb-5">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              placeholder="Search by username"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 py-3 pl-11 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
            />
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-950 text-slate-400">
                <tr>
                  <th className="px-4 py-3 font-medium">Username</th>
                  <th className="px-4 py-3 font-medium">Rank</th>
                  <th className="px-4 py-3 font-medium">Join date</th>
                  <th className="px-4 py-3 font-medium">Muted</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                {members.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-400" colSpan={5}>
                      No members are in this club yet.
                    </td>
                  </tr>
                ) : (
                  members.map((member) => {
                    const profile = profiles.get(member.user_id);
                    const username = profile?.username ?? member.user_id;

                    return (
                      <tr key={member.id}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-xs font-semibold text-slate-200">
                              {(profile?.username ?? member.user_id).slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-slate-100">{username}</div>
                              <div className="text-xs text-slate-500">{member.user_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300">{member.rank}</td>
                        <td className="px-4 py-3 text-slate-400">{formatJoinDate(member.created_at)}</td>
                        <td className="px-4 py-3 text-slate-300">{member.muted ? "Yes" : "No"}</td>
                        <td className="px-4 py-3 text-slate-400">Promote · Demote · Kick · Mute · Unmute</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="mb-4 flex items-center gap-3">
            <Shield className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-xl font-semibold">Permissions</h2>
              <p className="text-sm text-slate-400">This is where the rank rules will be enforced.</p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[
              "Leader: full control, disband, transfer leadership, moderation, and role changes.",
              "Co-Leader: manage most settings and moderate lower ranks.",
              "Senior Admin: moderate and manage up to Admin, including kicks and mutes below their rank.",
              "Admin: delete threads/comments and mute lower ranks.",
              "Coordinator: send invites only.",
              "Member: no special privileges.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300"
              >
                {item}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
