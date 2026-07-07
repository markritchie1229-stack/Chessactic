import Link from "next/link";
import { Inbox, Plus, Search } from "lucide-react";

import { createSupabaseServerClient } from "./_lib/supabase-server";
import { getActiveClubs } from "./_lib/server-queries";

type ClubsPageProps = {
  searchParams?: {
    q?: string;
    view?: string;
  };
};

type DirectoryView = "all" | "mine";

type ClubMemberRow = {
  club_id: string;
};

function buildHref(view: DirectoryView, query: string) {
  const params = new URLSearchParams();

  if (view === "mine") {
    params.set("view", "mine");
  }

  if (query) {
    params.set("q", query);
  }

  const qs = params.toString();
  return qs ? `/social/clubs?${qs}` : "/social/clubs";
}

function countByClubId(rows: ClubMemberRow[]) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    counts.set(row.club_id, (counts.get(row.club_id) ?? 0) + 1);
  }

  return counts;
}

export default async function ClubsPage({ searchParams }: ClubsPageProps) {
  const resolvedSearchParams = await searchParams;

  const query =
    typeof resolvedSearchParams?.q === "string"
      ? resolvedSearchParams.q.trim()
      : "";

  const view: DirectoryView =
    resolvedSearchParams?.view === "mine" ? "mine" : "all";

  const clubs = await getActiveClubs(query);
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let joinedClubIds = new Set<string>();
  let pendingInviteCount = 0;

  if (user) {
    const [
      { data: memberships, error },
      { count: inviteCount, error: inviteCountError },
    ] = await Promise.all([
      supabase.from("club_members").select("club_id").eq("user_id", user.id),
      supabase
        .from("club_invites")
        .select("id", { count: "exact", head: true })
        .eq("invited_user_id", user.id)
        .eq("status", "pending"),
    ]);

    if (error) {
      throw new Error(error.message);
    }

    if (inviteCountError) {
      throw new Error(inviteCountError.message);
    }

    joinedClubIds = new Set((memberships ?? []).map((row) => row.club_id));
    pendingInviteCount = inviteCount ?? 0;
  }

  const clubsToShow =
    view === "mine"
      ? clubs.filter((club) => joinedClubIds.has(club.id))
      : clubs;

  let memberCounts = new Map<string, number>();

  if (clubsToShow.length > 0) {
    const { data: membershipRows, error: memberCountError } = await supabase
      .from("club_members")
      .select("club_id")
      .in(
        "club_id",
        clubsToShow.map((club) => club.id),
      );

    if (memberCountError) {
      throw new Error(memberCountError.message);
    }

    memberCounts = countByClubId((membershipRows ?? []) as ClubMemberRow[]);
  }

  const isMineView = view === "mine";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="text-sm uppercase tracking-[0.28em] text-slate-400">
            Social
          </div>

          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
            {isMineView ? "Your Clubs" : "Clubs"}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            {isMineView
              ? "These are the clubs you are already in."
              : "Browse every club on Chessatical. Open one to view members, settings, forum, chat, and more."}
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
          <aside className="lg:sticky lg:top-6 h-fit space-y-3">
            <Link
              href={buildHref("mine", query)}
              className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 font-semibold transition ${
                isMineView
                  ? "border border-cyan-500 bg-cyan-500/10 text-cyan-200"
                  : "border border-slate-700 bg-slate-900 text-slate-100 hover:border-cyan-500 hover:bg-slate-800"
              }`}
            >
              Your Clubs
            </Link>

            <Link
              href="/social/clubs/create"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              <Plus className="h-4 w-4" />
              Create Club
            </Link>

            <Link
              href="/social/clubs/invites"
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-semibold text-slate-100 transition hover:border-cyan-500 hover:bg-slate-800"
            >
              <Inbox className="h-4 w-4" />
              Invite Inbox
              {pendingInviteCount > 0 ? (
                <span className="ml-1 inline-flex min-w-6 items-center justify-center rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                  {pendingInviteCount}
                </span>
              ) : null}
            </Link>
          </aside>

          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
            <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold">
                {isMineView ? "Your Clubs" : "Club Directory"}
              </h2>

              <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
                {clubsToShow.length} club{clubsToShow.length === 1 ? "" : "s"}
              </span>
            </div>

            <form method="get" className="mb-5">
              <input type="hidden" name="view" value={view} />

              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  name="q"
                  defaultValue={query}
                  placeholder="Search clubs"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 py-3 pl-11 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
                />
              </div>

              <div className="mt-3 flex items-center gap-3">
                <button
                  type="submit"
                  className="rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Search
                </button>

                {query || isMineView ? (
                  <Link
                    href={buildHref(isMineView ? "mine" : "all", "")}
                    className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-500 hover:bg-slate-900"
                  >
                    Clear
                  </Link>
                ) : null}
              </div>
            </form>

            {clubsToShow.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center text-slate-400">
                {isMineView
                  ? user
                    ? query
                      ? "No joined clubs match your search."
                      : "You are not in any clubs yet."
                    : "Sign in to see the clubs you are already in."
                  : query
                    ? "No clubs match your search."
                    : "No clubs have been created yet."}
              </div>
            ) : (
              <div className="space-y-3">
                {clubsToShow.map((club) => {
                  const totalMembers = memberCounts.get(club.id) ?? 0;

                  return (
                    <div
                      key={club.id}
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 transition hover:border-cyan-500 hover:bg-slate-950"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <Link
                          href={`/social/clubs/${encodeURIComponent(club.title_search)}`}
                          className="flex min-w-0 items-center gap-4"
                        >
                          {club.avatar_url ? (
                            <img
                              src={club.avatar_url}
                              alt={club.title}
                              className="h-14 w-14 shrink-0 rounded-2xl border border-slate-700 object-cover"
                            />
                          ) : (
                            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-lg font-bold">
                              {club.title.charAt(0).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <h3 className="truncate text-lg font-semibold">
                              {club.title}
                            </h3>

                            <p className="mt-1 text-sm leading-6 text-slate-400">
                              {club.description?.trim() || "No description yet."}
                            </p>
                          </div>
                        </Link>

                        <div className="shrink-0">
                          <span className="inline-flex rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-300">
                            {totalMembers} member{totalMembers === 1 ? "" : "s"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}