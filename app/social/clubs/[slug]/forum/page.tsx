import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, MessageSquare, Pin, Search, PlusCircle } from "lucide-react";

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

type ThreadRecord = {
  id: string;
  club_id: string;
  author_id: string | null;
  title: string;
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

async function getThreads(clubId: string): Promise<ThreadRecord[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("club_threads")
    .select("id, club_id, author_id, title")
    .eq("club_id", clubId);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ThreadRecord[];
}

export default async function ClubForumPage({ params }: ClubPageProps) {
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
              This forum page could not find an active club for the slug in the URL.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const base = `/social/clubs/${club.title_search}`;
  const threads = await getThreads(club.id);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
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
              <Link
                href={`${base}/members`}
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800"
              >
                Members
              </Link>
              <Link
                href={`${base}/invite`}
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800"
              >
                Invite
              </Link>
              <Link
                href={`${base}/forum`}
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950"
              >
                Forum
              </Link>
              <Link
                href={`${base}/settings`}
                className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800"
              >
                Settings
              </Link>
            </div>
          </div>
        </div>

        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="text-sm uppercase tracking-[0.28em] text-slate-400">Forum</div>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{club.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Threads live here. Muted members should not be able to create new threads.
          </p>
        </header>

        <div className="mt-6 flex flex-col gap-6 lg:flex-row">
          <main className="flex-1 space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    placeholder="Search threads"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 py-3 pl-11 pr-4 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-500"
                  />
                </div>

                <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400">
                  <PlusCircle className="h-4 w-4" />
                  New Thread
                </button>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-center gap-3">
                <Pin className="h-5 w-5 text-cyan-400" />
                <div>
                  <h2 className="text-xl font-semibold">Pinned threads</h2>
                  <p className="text-sm text-slate-400">Pinned threads stay at the top of the forum.</p>
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-5 text-sm leading-6 text-slate-400">
                Pinned thread cards will go here.
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-cyan-400" />
                <div>
                  <h2 className="text-xl font-semibold">Recent threads</h2>
                  <p className="text-sm text-slate-400">Loaded from the club_threads table.</p>
                </div>
              </div>

              {threads.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-5 text-sm text-slate-400">
                  No threads yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {threads.map((thread) => (
                    <div key={thread.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                      <div className="font-medium text-slate-100">{thread.title}</div>
                      <div className="mt-2 text-sm leading-6 text-slate-400">
                        Author ID: {thread.author_id ?? "unknown"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </main>

          <aside className="w-full lg:w-[20rem]">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
              <h2 className="text-xl font-semibold">Forum rules</h2>
              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-300">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  All members can post threads unless muted.
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  Admins and above can delete threads and comments.
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  Leader and Co-Leader can manage club settings.
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
