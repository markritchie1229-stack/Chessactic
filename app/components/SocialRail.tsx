"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import {
  Check,
  Copy,
  ImagePlus,
  PencilLine,
  Save,
  Shield,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type ProfileRow = {
  id: string;
  username: string | null;
  created_at: string | null;
  last_seen: string | null;
  games_solved: number | null;
  current_streak: number | null;
  longest_streak: number | null;
  puzzle_rating: number | null;
  accuracy: number | null;
  favorite_theme: string | null;
  avatar_url?: string | null;
  bio?: string | null;
  country?: string | null;
  favorite_opening?: string | null;
  favorite_player?: string | null;
};

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString();
}

function formatAccuracy(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return "—";
  const percentage = value <= 1 ? value * 100 : value;
  return `${percentage.toFixed(1)}%`;
}

function buildAvatarFallback(username: string | null | undefined) {
  const cleaned = username?.trim() || "P";
  return cleaned.slice(0, 1).toUpperCase();
}

function getAvatarPathFromUrl(url: string | null | undefined) {
  if (!url) return null;

  const marker = "/storage/v1/object/public/avatars/";
  const index = url.indexOf(marker);
  if (index === -1) return null;

  return decodeURIComponent(url.slice(index + marker.length));
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams<{ username?: string }>();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const usernameParam = useMemo(() => {
    const raw = params?.username;
    if (typeof raw !== "string") return "";
    return raw.trim().toLowerCase();
  }, [params]);

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [favoriteOpening, setFavoriteOpening] = useState("");
  const [favoritePlayer, setFavoritePlayer] = useState("");
  const [copied, setCopied] = useState(false);

  const isOwner = Boolean(session?.user.id && profile?.id === session.user.id);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setMessage("");

      const { data } = await supabase.auth.getSession();
      const nextSession = data.session;

      if (!mounted) return;
      setSession(nextSession);

      if (!usernameParam) {
        setProfile(null);
        setLoading(false);
        setMessage("Missing profile username.");
        return;
      }

      const { data: row, error } = await supabase
        .from("profiles")
        .select(
          "id,username,created_at,last_seen,games_solved,current_streak,longest_streak,puzzle_rating,accuracy,favorite_theme,avatar_url,bio,country,favorite_opening,favorite_player",
        )
        .eq("username", usernameParam)
        .maybeSingle();

      if (!mounted) return;

      if (error) {
        console.warn("Could not load profile:", error);
        setProfile(null);
        setLoading(false);
        setMessage("Could not load this profile.");
        return;
      }

      const nextProfile = (row as ProfileRow | null) ?? null;
      setProfile(nextProfile);
      setUsername(nextProfile?.username ?? "");
      setAvatarUrl(nextProfile?.avatar_url ?? "");
      setBio(nextProfile?.bio ?? "");
      setCountry(nextProfile?.country ?? "");
      setFavoriteOpening(nextProfile?.favorite_opening ?? "");
      setFavoritePlayer(nextProfile?.favorite_player ?? "");
      setEditing(false);
      setLoading(false);

      if (!nextProfile) {
        setMessage("Profile not found.");
      }
    };

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [usernameParam]);

  const uploadAvatar = async (file: File) => {
    if (!profile || !session?.user) return;

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      setMessage("Please upload a PNG, JPG, WEBP, or GIF image.");
      return;
    }

    setUploadingAvatar(true);
    setMessage("");

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "png";
      const safeExt = ["png", "jpg", "jpeg", "webp", "gif"].includes(extension)
        ? extension
        : "png";

      const previousPath = getAvatarPathFromUrl(avatarUrl);
      const path = `${session.user.id}/${Date.now()}.${safeExt}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage.from("avatars").getPublicUrl(path);
      const nextUrl = publicData.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: nextUrl })
        .eq("id", profile.id);

      if (updateError) throw updateError;

      if (previousPath && previousPath !== path) {
        await supabase.storage.from("avatars").remove([previousPath]);
      }

      setAvatarUrl(nextUrl);
      setProfile((prev) => (prev ? { ...prev, avatar_url: nextUrl } : prev));
      setMessage("Avatar updated.");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage(err.message);
      } else {
        setMessage("Could not upload avatar.");
      }
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveProfile = async () => {
    if (!profile || !session?.user) return;

    setSaving(true);
    setMessage("");

    try {
      const cleanedUsername = username.trim().toLowerCase();
      const cleanedAvatarUrl = avatarUrl.trim();
      const cleanedBio = bio.trim();
      const cleanedCountry = country.trim();
      const cleanedFavoriteOpening = favoriteOpening.trim();
      const cleanedFavoritePlayer = favoritePlayer.trim();

      if (!cleanedUsername) {
        setMessage("Username cannot be empty.");
        return;
      }

      if (cleanedUsername.length < 3) {
        setMessage("Username must be at least 3 characters.");
        return;
      }

      if (!/^[a-z0-9_]+$/.test(cleanedUsername)) {
        setMessage("Use only letters, numbers, and underscores.");
        return;
      }

      if (cleanedUsername !== profile.username?.trim().toLowerCase()) {
        const { data: usernameTaken, error: usernameCheckError } = await supabase.rpc(
          "is_username_taken",
          {
            p_username: cleanedUsername,
          },
        );

        if (usernameCheckError) throw usernameCheckError;

        if (usernameTaken) {
          setMessage("Username is already taken.");
          return;
        }
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: { username: cleanedUsername },
      });
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: cleanedUsername,
          avatar_url: cleanedAvatarUrl || null,
          bio: cleanedBio || null,
          country: cleanedCountry || null,
          favorite_opening: cleanedFavoriteOpening || null,
          favorite_player: cleanedFavoritePlayer || null,
        })
        .eq("id", profile.id);
      if (profileError) throw profileError;

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              username: cleanedUsername,
              avatar_url: cleanedAvatarUrl || null,
              bio: cleanedBio || null,
              country: cleanedCountry || null,
              favorite_opening: cleanedFavoriteOpening || null,
              favorite_player: cleanedFavoritePlayer || null,
            }
          : prev,
      );
      setEditing(false);
      setMessage("Profile updated.");
      router.replace(`/profile/${cleanedUsername}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage(err.message);
      } else {
        setMessage("Something went wrong.");
      }
    } finally {
      setSaving(false);
    }
  };

  const shareProfile = async () => {
    if (!profile?.username) return;

    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/profile/${profile.username}`,
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setMessage("Could not copy link.");
    }
  };

  const statCards = useMemo(
    () => [
      {
        label: "Games solved",
        value: formatNumber(profile?.games_solved ?? 0),
      },
      {
        label: "Current streak",
        value: formatNumber(profile?.current_streak),
      },
      {
        label: "Longest streak",
        value: formatNumber(profile?.longest_streak),
      },
      {
        label: "Puzzle rating",
        value: formatNumber(profile?.puzzle_rating),
      },
      {
        label: "Accuracy",
        value: formatAccuracy(profile?.accuracy),
      },
      {
        label: "Favorite theme",
        value: profile?.favorite_theme?.trim() || "—",
      },
    ],
    [profile],
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          Loading profile...
        </div>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
        <div className="mx-auto max-w-5xl rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="text-sm uppercase tracking-wide text-slate-400">
            Profile
          </div>
          <h1 className="mt-2 text-3xl font-semibold">Profile not found</h1>
          <p className="mt-3 text-slate-400">
            {message || "That profile does not exist."}
          </p>
          <button
            onClick={() => router.push("/")}
            className="mt-6 rounded-2xl bg-slate-100 px-4 py-3 font-medium text-slate-950 transition hover:bg-white"
          >
            Go home
          </button>
        </div>
      </main>
    );
  }

  const avatarFallback = buildAvatarFallback(profile.username);

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
              <button
                type="button"
                onClick={() => isOwner && editing && fileInputRef.current?.click()}
                className={`flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 text-3xl font-semibold text-slate-100 transition ${
                  isOwner && editing ? "cursor-pointer hover:ring-2 hover:ring-slate-500" : "cursor-default"
                }`}
                aria-label={isOwner && editing ? "Change avatar" : "Profile avatar"}
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={`${profile.username} avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  avatarFallback
                )}
              </button>

              <div>
                <div className="text-sm uppercase tracking-wide text-slate-400">
                  Public profile
                </div>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
                  {profile.username}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                  This profile is visible to everyone. Only the owner can edit the
                  account details.
                </p>

                <div className="mt-4 flex flex-wrap gap-2 text-sm text-slate-300">
                  {profile.country ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1">
                      <Shield className="h-4 w-4" />
                      {profile.country}
                    </span>
                  ) : null}
                  {profile.favorite_opening ? (
                    <span className="rounded-full border border-slate-800 bg-slate-950/60 px-3 py-1">
                      {profile.favorite_opening}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={shareProfile}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy link"}
              </button>

              {isOwner && !editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-white"
                >
                  <PencilLine className="h-4 w-4" />
                  Edit profile
                </button>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-slate-500">Joined</div>
              <div className="mt-1 font-medium text-slate-100">
                {formatDateTime(profile.created_at)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-slate-500">Last seen</div>
              <div className="mt-1 font-medium text-slate-100">
                {formatDateTime(profile.last_seen)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-slate-500">Public status</div>
              <div className="mt-1 font-medium text-slate-100">Visible to all</div>
            </div>
          </div>
        </section>

        {profile.bio ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
            <div className="text-sm uppercase tracking-wide text-slate-400">
              Bio
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 sm:text-base">
              {profile.bio}
            </p>
          </section>
        ) : null}

        {editing && isOwner ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadAvatar(file);
                e.target.value = "";
              }}
            />

            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-wide text-slate-400">
                  Edit profile
                </div>
                <h2 className="mt-1 text-xl font-semibold">Owner controls</h2>
              </div>
              <button
                onClick={() => {
                  setEditing(false);
                  setUsername(profile.username ?? "");
                  setAvatarUrl(profile.avatar_url ?? "");
                  setBio(profile.bio ?? "");
                  setCountry(profile.country ?? "");
                  setFavoriteOpening(profile.favorite_opening ?? "");
                  setFavoritePlayer(profile.favorite_player ?? "");
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 transition hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>

            <div className="mt-4 grid gap-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
                  placeholder="new_username"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Avatar URL
                </label>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
                    placeholder="https://..."
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    className="flex h-12 w-12 flex-none items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-300 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Upload avatar image"
                  >
                    <ImagePlus className="h-5 w-5" />
                  </button>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {uploadingAvatar
                    ? "Uploading avatar..."
                    : "Click the icon to upload an image to Supabase Storage."}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">Bio</label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
                  placeholder="Tell people a little about your chess style..."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Country
                  </label>
                  <input
                    type="text"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
                    placeholder="United States"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm text-slate-300">
                    Favorite opening
                  </label>
                  <input
                    type="text"
                    value={favoriteOpening}
                    onChange={(e) => setFavoriteOpening(e.target.value)}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
                    placeholder="Sicilian Defense"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-300">
                  Favorite player
                </label>
                <input
                  type="text"
                  value={favoritePlayer}
                  onChange={(e) => setFavoritePlayer(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
                  placeholder="Magnus Carlsen"
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg"
            >
              <div className="text-sm text-slate-500">{card.label}</div>
              <div className="mt-2 text-2xl font-semibold text-slate-100">
                {card.value}
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
          <div className="text-sm uppercase tracking-wide text-slate-400">
            Notes
          </div>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">
            This adds the first profile identity layer: avatar upload, bio,
            country, favorite opening, and favorite player.
          </p>
          {message ? (
            <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
              {message}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
