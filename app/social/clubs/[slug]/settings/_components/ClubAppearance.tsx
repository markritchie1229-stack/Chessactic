"use client";

import { useMemo, useState, useTransition, type FormEvent } from "react";
import { Loader2, Settings2 } from "lucide-react";

import { supabase } from "@/lib/supabase";
import { updateClubAppearance } from "../../../_lib/server-actions";
import type { Club, ClubRank } from "../../../_lib/types";

type Props = {
  club: Club;
  actorRank: ClubRank;
};

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "";
}

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

export function ClubAppearance({ club, actorRank }: Props) {
  const [title, setTitle] = useState(club.title);
  const [description, setDescription] = useState(club.description ?? "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [savedAvatarUrl, setSavedAvatarUrl] = useState(club.avatar_url ?? "");
  const [savedBannerUrl, setSavedBannerUrl] = useState(club.banner_url ?? "");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  const dirty = useMemo(() => {
    return (
      title.trim() !== club.title ||
      description.trim() !== (club.description ?? "") ||
      avatarFile !== null ||
      bannerFile !== null
    );
  }, [title, description, avatarFile, bannerFile, club]);

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!dirty || isPending) return;

    setError("");
    setStatus("");

    startTransition(async () => {
      try {
        let nextAvatarUrl = savedAvatarUrl;
        let nextBannerUrl = savedBannerUrl;

        if (avatarFile) {
          nextAvatarUrl = await uploadClubMediaFile(club.id, avatarFile, "avatar");
        }

        if (bannerFile) {
          nextBannerUrl = await uploadClubMediaFile(club.id, bannerFile, "banner");
        }

        await updateClubAppearance(club.id, actorRank, {
          title: title.trim(),
          description: description.trim(),
          avatarUrl: normalizeUrl(nextAvatarUrl),
          bannerUrl: normalizeUrl(nextBannerUrl),
        });

        setSavedAvatarUrl(nextAvatarUrl);
        setSavedBannerUrl(nextBannerUrl);
        setAvatarFile(null);
        setBannerFile(null);
        setStatus("Club appearance updated.");
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to update club appearance.",
        );
      }
    });
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="mb-4 flex items-center gap-3">
        <Settings2 className="h-5 w-5 text-cyan-400" />
        <div>
          <h2 className="text-xl font-semibold">Club appearance</h2>
          <p className="mt-2 text-sm text-slate-400">
            Update your club title, description, avatar, and banner.
          </p>
        </div>
      </div>

      {status ? (
        <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {status}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSave} className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4">
          <label className="grid gap-2">
            <span className="text-sm font-medium text-slate-100">Club title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
              placeholder="Club title"
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
                {avatarFile
                  ? `Selected: ${avatarFile.name}`
                  : "Leave blank to keep the current avatar."}
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
                {bannerFile
                  ? `Selected: ${bannerFile.name}`
                  : "Leave blank to keep the current banner."}
              </span>
            </label>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={!dirty || isPending}
              className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save appearance"
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setTitle(club.title);
                setDescription(club.description ?? "");
                setAvatarFile(null);
                setBannerFile(null);
                setError("");
                setStatus("");
              }}
              disabled={!dirty || isPending}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-500 hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-950/70">
          <div className="relative min-h-72 bg-slate-900">
            {savedBannerUrl ? (
              <img
                src={savedBannerUrl}
                alt={`${club.title} banner`}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex items-end gap-4 rounded-2xl border border-slate-700 bg-slate-950/75 p-4 backdrop-blur-sm">
                {savedAvatarUrl ? (
                  <img
                    src={savedAvatarUrl}
                    alt={`${club.title} avatar`}
                    className="h-20 w-20 rounded-2xl border border-slate-700 object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-900 text-lg font-semibold text-slate-400">
                    {club.title.charAt(0).toUpperCase()}
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
            Uploaded files go to the <code>club-media</code> bucket, then the saved
            URLs are written back to the club record.
          </div>
        </div>
      </form>
    </section>
  );
}