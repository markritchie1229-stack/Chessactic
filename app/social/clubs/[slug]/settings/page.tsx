import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Settings2, Shield, Trash2, UserCheck, Users } from "lucide-react";

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

export default async function ClubSettingsPage({ params }: ClubPageProps) {
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
              This settings page could not find an active club for the slug in the URL.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const base = `/social/clubs/${club.title_search}`;

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
              <Link href={`${base}/members`} className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800">
                Members
              </Link>
              <Link href={`${base}/invite`} className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800">
                Invite
              </Link>
              <Link href={`${base}/forum`} className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800">
                Forum
              </Link>
              <Link href={`${base}/settings`} className="inline-flex items-center justify-center rounded-xl border border-slate-700 bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950">
                Settings
              </Link>
            </div>
          </div>
        </div>

        <header className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="text-sm uppercase tracking-[0.28em] text-slate-400">Club settings</div>
          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{club.title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            Only the Leader and Co-Leader should be able to access this page.
          </p>
        </header>

        <section className="mt-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="mb-4 flex items-center gap-3">
            <Settings2 className="h-5 w-5 text-cyan-400" />
            <div>
              <h2 className="text-xl font-semibold">Club controls</h2>
              <p className="text-sm text-slate-400">
                This is where leader-level settings, moderation, and club management will live.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {[
              {
                icon: <Shield className="h-4 w-4 text-cyan-400" />,
                title: "Disband club",
                text: "Leader only. Remove the club entirely.",
              },
              {
                icon: <UserCheck className="h-4 w-4 text-cyan-400" />,
                title: "Transfer leadership",
                text: "Promote another member to Leader and step down.",
              },
              {
                icon: <Users className="h-4 w-4 text-cyan-400" />,
                title: "Role management",
                text: "Promotions, demotions, mutes, and unmute controls.",
              },
              {
                icon: <Trash2 className="h-4 w-4 text-cyan-400" />,
                title: "Thread moderation",
                text: "Delete forum threads and club chat comments.",
              },
              {
                icon: <Settings2 className="h-4 w-4 text-cyan-400" />,
                title: "Club appearance",
                text: "Edit title, description, avatar, and background image.",
              },
              {
                icon: <Shield className="h-4 w-4 text-cyan-400" />,
                title: "Moderation limits",
                text: "Role limits and moderation rules will be enforced here.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300"
              >
                <div className="mb-2 flex items-center gap-2 font-medium text-slate-100">
                  {item.icon}
                  {item.title}
                </div>
                {item.text}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
