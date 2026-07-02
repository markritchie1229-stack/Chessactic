"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, BadgeInfo, Shield, Users } from "lucide-react";

type ClubRecord = {
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
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

export default function ClubPage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params?.slug) ? params.slug[0] : params?.slug;

  const [club, setClub] = useState<ClubRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadClub() {
      if (!slug) {
        setError("Missing club slug.");
        setLoading(false);
        return;
      }

      try {
        const supabase = getSupabaseClient();
        const { data, error: fetchError } = await supabase
          .from("clubs")
          .select(
            "title, title_search, description, avatar_url, banner_url, created_by, disbanded_at, created_at, updated_at",
          )
          .eq("title_search", slug)
          .is("disbanded_at", null)
          .maybeSingle();

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        if (mounted) {
          setClub((data ?? null) as ClubRecord | null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load club.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadClub();

    return () => {
      mounted = false;
    };
  }, [slug]);

  const description = club?.description?.trim() || "This club does not have a description yet.";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/clubs"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to clubs
          </Link>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-400">
            Loading club...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-500/30 bg-red-500/10 p-6 text-sm text-red-200">
            {error}
          </div>
        ) : !club ? (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
            <h1 className="text-3xl font-semibold">Club not found</h1>
            <p className="mt-3 text-sm text-slate-400">
              The club may not exist yet, or you may not have access to it.
            </p>
          </div>
        ) : (
          <header className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/20">
            {club.banner_url ? (
              <div
                className="h-56 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${club.banner_url})` }}
              />
            ) : (
              <div className="h-56 w-full bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />
            )}

            <div className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="text-sm uppercase tracking-[0.28em] text-slate-400">Club page</div>
                  <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">{club.title}</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{description}</p>
                </div>

                {club.avatar_url ? (
                  <img
                    src={club.avatar_url}
                    alt={club.title}
                    className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-700"
                  />
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap gap-2 text-xs text-slate-400">
                <span className="rounded-full bg-slate-950 px-3 py-1">Forum</span>
                <span className="rounded-full bg-slate-950 px-3 py-1">Threads</span>
                <span className="rounded-full bg-slate-950 px-3 py-1">Club chat</span>
                <span className="rounded-full bg-slate-950 px-3 py-1">Members</span>
              </div>
            </div>
          </header>
        )}

        {!loading && club ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-center gap-3">
                <BadgeInfo className="h-5 w-5 text-cyan-400" />
                <div>
                  <h2 className="text-xl font-semibold">Forum</h2>
                  <p className="text-sm text-slate-400">Club-only forum content lives here.</p>
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-5 text-sm leading-6 text-slate-400">
                Hook this section to your Supabase forum tables.
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-center gap-3">
                <Users className="h-5 w-5 text-cyan-400" />
                <div>
                  <h2 className="text-xl font-semibold">Threads</h2>
                  <p className="text-sm text-slate-400">Threads only appear on the club page.</p>
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-5 text-sm leading-6 text-slate-400">
                Pull thread rows from Supabase here.
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-center gap-3">
                <Shield className="h-5 w-5 text-cyan-400" />
                <div>
                  <h2 className="text-xl font-semibold">Club settings</h2>
                  <p className="text-sm text-slate-400">Leader and admin controls belong here.</p>
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-5 text-sm leading-6 text-slate-400">
                Add permissions, invites, role management, and moderation controls here.
              </div>
            </section>

            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-center gap-3">
                <Users className="h-5 w-5 text-cyan-400" />
                <div>
                  <h2 className="text-xl font-semibold">Club chat</h2>
                  <p className="text-sm text-slate-400">Members can post comments here.</p>
                </div>
              </div>
              <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-5 text-sm leading-6 text-slate-400">
                Add realtime chat once your backend is ready.
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}