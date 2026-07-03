"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ImagePlus, Sparkles, Wallpaper } from "lucide-react";

import { supabase } from "../_lib/supabase";

const STORAGE_BUCKET = "club-media";
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

async function uploadClubImage(
  file: File,
  clubSlug: string,
  kind: "avatar" | "banner",
) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${clubSlug}/${kind}-${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

type CreateClubFormProps = {
  onCreated?: (titleSearch: string) => void | Promise<void>;
};

export function CreateClubForm({ onCreated }: CreateClubFormProps) {
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

    setSubmitting(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      if (!user) {
        throw new Error("You must be signed in to create a club.");
      }

      const slug = slugify(trimmedTitle);

      let avatarUrl: string | null = null;
      let bannerUrl: string | null = null;

      if (avatarFile) {
        avatarUrl = await uploadClubImage(avatarFile, slug, "avatar");
      }

      if (bannerFile) {
        bannerUrl = await uploadClubImage(bannerFile, slug, "banner");
      }

      const { data: club, error: insertError } = await supabase
        .from("clubs")
        .insert({
          title: trimmedTitle,
          description: description.trim() || null,
          avatar_url: avatarUrl,
          banner_url: bannerUrl,
          created_by: user.id,
        })
        .select("id, title_search")
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      if (!club?.id) {
        throw new Error("Club was created, but the club id is missing.");
      }

      const { error: membershipError } = await supabase
        .from("club_members")
        .insert({
          club_id: club.id,
          user_id: user.id,
          rank: "Leader",
          muted: false,
        });

      if (membershipError) {
        await supabase.from("clubs").delete().eq("id", club.id);
        throw new Error(membershipError.message);
      }

      const routeSlug = club.title_search ?? slugify(trimmedTitle);

      await onCreated?.(routeSlug);
      router.push(`/social/clubs/${routeSlug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create club.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="mb-4 flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-cyan-400" />
        <div>
          <h2 className="text-xl font-semibold">Create a new club</h2>
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
          <label className="mb-2 block text-sm text-slate-300">
            Club description
          </label>
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
  );
}