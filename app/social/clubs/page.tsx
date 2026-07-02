"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowRight, ImagePlus, Search, Shield, Sparkles, Wallpaper } from "lucide-react";

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

const STORAGE_BUCKET = "club-media";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables.");
  }

  return createClient(supabaseUrl, supabaseAnonKey);
}

async function uploadClubImage(file: File, clubSlug: string, kind: "avatar" | "banner") {
  const supabase = getSupabaseClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${clubSlug}/${kind}-${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export default function ClubsPage() {
  const [clubs, setClubs] = useState<ClubRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showCreateFlow, setShowCreateFlow] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadClubs() {
      try {
        const supabase = getSupabaseClient();
        const { data, error: fetchError } = await supabase
          .from("clubs")
          .select(
            "id, title, title_search, description, avatar_url, banner_url, created_by, disbanded_at, created_at, updated_at",
          )
          .is("disbanded_at", null)
          .order("created_at", { ascending: false });

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        if (mounted) {
          setClubs((data ?? []) as ClubRecord[]);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load clubs.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadClubs();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredClubs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clubs;

    return clubs.filter((club) => {
      return (
        club.title.toLowerCase().includes(query) ||
        (club.description ?? "").toLowerCase().includes(query) ||
        (club.created_by ?? "").toLowerCase().includes(query)
      );
    });
  }, [clubs, search]);

  const handleCreateClub = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Please enter a club title.");
      return;
    }

    const supabase = getSupabaseClient();
    const slug = slugify(trimmedTitle);

    setSubmitting(true);
    setError("");

    try {
      let avatarUrl: string | null = null;
      let bannerUrl: string | null = null;

      if (avatarFile) {
        avatarUrl = await uploadClubImage(avatarFile, slug, "avatar");
      }

      if (bannerFile) {
        bannerUrl = await uploadClubImage(bannerFile, slug, "banner");
      }

      const { data, error: insertError } = await supabase
        .from("clubs")
        .insert({
          title: trimmedTitle,
          title_search: slug,
          description: description.trim() || null,
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
          created_by: null,
        })
        .select(
          "id, title, title_search, description, avatar_url, banner_url, created_by, disbanded_at, created_at, updated_at",
        )
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      if (data) {
        setClubs((current) => [data as ClubRecord, ...current]);
      }

      setTitle("");
      setDescription("");
      setAvatarFile(null);
      setBannerFile(null);
      setShowCreateFlow(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create club.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.28em] text-slate-400">Social</div>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Clubs</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Browse clubs here. Each club has its own page for forum, threads, chat, and settings.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateFlow(true)}
            className="inline-flex h-fit items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Create New Club
            <ArrowRight className="h-4 w-4" />
          </button>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
          <main className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Club list</h2>
                  <p className="text-sm text-slate-400">Open a club page or create a new club.</p>
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
                  {filteredClubs.length} clubs
                </div>
              </div>

              <div className="relative mb-5">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search clubs"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 py-3 pl-11 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
                />
              </div>

              {loading ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-sm text-slate-400">
                  Loading clubs...
                </div>
              ) : filteredClubs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-sm text-slate-400">
                  No clubs yet. Create the first club to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredClubs.map((club) => (
                    <Link
                      key={club.id}
                      href={`/clubs/${club.title_search}`}
                      className="group block rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-500/40 hover:bg-slate-950"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-100 group-hover:text-cyan-300">
                              {club.title}
                            </span>
                            <Shield className="h-4 w-4 text-slate-500" />
                          </div>
                          <div className="text-sm text-slate-500">
                            Created by {club.created_by ?? "unknown"}
                          </div>
                        </div>

                        <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                          Open club page
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-slate-300">
                        {club.description?.trim() || "No description yet."}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                        <span className="rounded-full bg-slate-900 px-3 py-1">
                          Slug: {club.title_search}
                        </span>
                        {club.banner_url ? (
                          <span className="rounded-full bg-slate-900 px-3 py-1">Banner uploaded</span>
                        ) : null}
                        {club.avatar_url ? (
                          <span className="rounded-full bg-slate-900 px-3 py-1">Avatar uploaded</span>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </main>

          <aside className="space-y-6">
            {showCreateFlow ? (
              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
                <div className="mb-4 flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-cyan-400" />
                  <div>
                    <h2 className="text-xl font-semibold">Create a new club</h2>
                    <p className="text-sm text-slate-400">
                      Upload images and fill out the club details.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Club title</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter club title"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Club description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Write a short club description"
                      rows={4}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-500"
                    />
                  </div>

                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
                      <ImagePlus className="h-4 w-4 text-cyan-400" />
                      Club avatar
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-slate-100 hover:file:bg-slate-700"
                    />
                    <div className="mt-2 text-xs text-slate-500">
                      Selected: {avatarFile ? avatarFile.name : "No image selected"}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
                      <Wallpaper className="h-4 w-4 text-cyan-400" />
                      Club banner
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)}
                      className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-slate-100 hover:file:bg-slate-700"
                    />
                    <div className="mt-2 text-xs text-slate-500">
                      Selected: {bannerFile ? bannerFile.name : "No image selected"}
                    </div>
                  </div>

                  {error ? (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {error}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleCreateClub}
                    disabled={submitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? "Creating..." : "Create Club"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </section>
            ) : (
              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
                <div className="mb-4 flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-cyan-400" />
                  <div>
                    <h2 className="text-xl font-semibold">Create a new club</h2>
                    <p className="text-sm text-slate-400">Start the club creation flow from here.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateFlow(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Create New Club
                  <ArrowRight className="h-4 w-4" />
                </button>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}