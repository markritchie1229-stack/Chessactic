"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { createClub } from "../_lib/server-actions";

async function uploadClubMediaFile(
  clubId: string,
  file: File,
  kind: "avatar" | "banner",
) {
  const extension = file.name.split(".").pop() || "bin";
  const path = `${clubId}/${kind}-${crypto.randomUUID()}.${extension}`;

  const { error } = await supabase.storage.from("club-media").upload(path, file, {
    upsert: true,
    contentType: file.type || "application/octet-stream",
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from("club-media").getPublicUrl(path);
  return data.publicUrl;
}

export function CreateClubForm() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const avatarPreview = avatarFile ? URL.createObjectURL(avatarFile) : null;
  const bannerPreview = bannerFile ? URL.createObjectURL(bannerFile) : null;

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
      if (bannerPreview) URL.revokeObjectURL(bannerPreview);
    };
  }, [avatarPreview, bannerPreview]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || isPending) return;

    setError("");

    startTransition(async () => {
      try {
        const tempClubId = crypto.randomUUID();

        let avatarUrl: string | null = null;
        let bannerUrl: string | null = null;

        if (avatarFile) {
          avatarUrl = await uploadClubMediaFile(tempClubId, avatarFile, "avatar");
        }

        if (bannerFile) {
          bannerUrl = await uploadClubMediaFile(tempClubId, bannerFile, "banner");
        }

        const club = await createClub({
          title: title.trim(),
          description: description.trim(),
          avatarUrl,
          bannerUrl,
        });

        if (!club.title_search) {
          throw new Error("Club was created, but no slug was returned.");
        }

        router.push(`/social/clubs/${encodeURIComponent(club.title_search)}`);
router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to create club.");
      }
    });
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-100">Club title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
              placeholder="Club title"
              autoComplete="off"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-100">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
              placeholder="Describe the club"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-100">Avatar image</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setAvatarFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:text-slate-100 hover:file:bg-slate-700"
              />
              <span className="text-xs text-slate-400">
                {avatarFile ? `Selected: ${avatarFile.name}` : "Optional"}
              </span>
            </label>

            <label className="grid gap-2">
              <span className="text-sm font-medium text-slate-100">Banner image</span>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setBannerFile(e.target.files?.[0] ?? null)}
                className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-300 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-800 file:px-3 file:py-2 file:text-sm file:text-slate-100 hover:file:bg-slate-700"
              />
              <span className="text-xs text-slate-400">
                {bannerFile ? `Selected: ${bannerFile.name}` : "Optional"}
              </span>
            </label>
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending || !title.trim()}
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Club
                </>
              )}
            </button>

            <p className="text-sm text-slate-400">
              Images upload to Supabase Storage before the club is created.
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70">
          <div className="relative min-h-72 bg-slate-900">
            {bannerPreview ? (
              <img
                src={bannerPreview}
                alt="Banner preview"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-end gap-4 rounded-2xl border border-slate-700 bg-slate-950/75 p-4 backdrop-blur-sm">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Avatar preview"
                    className="h-20 w-20 rounded-2xl border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900 text-lg font-semibold text-slate-400">
                    A
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                    Preview
                  </p>
                  <h3 className="truncate text-2xl font-semibold text-slate-50">
                    {title.trim() || "Untitled club"}
                  </h3>
                  <p className="mt-1 line-clamp-3 text-sm leading-6 text-slate-300">
                    {description.trim() || "No description yet."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 p-4 text-sm text-slate-400">
            Avatar and banner images upload to the <code>club-media</code> bucket, then the club is created and you are sent to its page.
          </div>
        </div>
      </form>
    </section>
  );
}