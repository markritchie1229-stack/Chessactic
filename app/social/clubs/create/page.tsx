"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Sparkles, Wallpaper } from "lucide-react";

const STORAGE_BUCKET = "club media";
const PROFANE_WORDS = ["badword", "curse", "profanity", "swear"];

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function containsProfanity(value: string) {
  const lower = value.toLowerCase();
  return PROFANE_WORDS.some((word) => lower.includes(word));
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

export default function CreateClubPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleCreateClub = async () => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Please enter a club title.");
      return;
    }

    if (containsProfanity(trimmedTitle)) {
      setError("Not appropriate");
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
        .select("title_search")
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      if (!data?.title_search) {
        throw new Error("Club was created, but the route slug is missing.");
      }

      router.push(`/social/clubs/${data.title_search}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create club.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/social/clubs"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to clubs
          </Link>
        </div>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="mb-4 flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-cyan-400" />
            <div>
              <h1 className="text-3xl font-semibold">Create a new club</h1>
              <p className="mt-2 text-sm text-slate-400">
                Choose a title, add a description, and upload a picture and background.
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
                rows={5}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-500"
              />
            </div>

            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
                <ImagePlus className="h-4 w-4 text-cyan-400" />
                Club picture
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
                Club background
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
      </div>
    </div>
  );
}
