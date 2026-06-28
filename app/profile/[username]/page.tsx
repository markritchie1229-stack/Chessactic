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
  Trash2,
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
  avatar_url: string | null;
  bio: string | null;
};

const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_BIO_LENGTH = 500;

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

function getInitials(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? trimmed[0] ?? "?";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return `${first}${second}`.toUpperCase();
}

function isBlobUrl(value: string | null) {
  return Boolean(value?.startsWith("blob:"));
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams<{ username?: string }>();
  const usernameParam = useMemo(() => {
    const raw = params?.username;
    if (typeof raw !== "string") return "";
    return raw.trim().toLowerCase();
  }, [params]);

  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [copied, setCopied] = useState(false);
  const mountedRef = useRef(true);

  const isOwner = Boolean(session?.user.id && profile?.id === session.user.id);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (avatarPreview && isBlobUrl(avatarPreview)) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const loadProfile = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }
    setMessage("");

    const { data } = await supabase.auth.getSession();
    const nextSession = data.session;

    if (!mountedRef.current) return;
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
        "id,username,created_at,last_seen,games_solved,current_streak,longest_streak,puzzle_rating,accuracy,favorite_theme,avatar_url,bio",
      )
      .eq("username", usernameParam)
      .maybeSingle();

    if (!mountedRef.current) return;

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
    setBio(nextProfile?.bio ?? "");
    setAvatarFile(null);
    setAvatarRemoved(false);
    setAvatarPreview(null);
    setEditing(false);
    setLoading(false);

    if (!nextProfile) {
      setMessage("Profile not found.");
    }
  };

  useEffect(() => {
    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernameParam]);

  useEffect(() => {
    const handleProfileUpdate = () => {
      void loadProfile(true);
    };

    window.addEventListener("profile-updated", handleProfileUpdate);
    window.addEventListener("profile-metrics-updated", handleProfileUpdate);

    return () => {
      window.removeEventListener("profile-updated", handleProfileUpdate);
      window.removeEventListener("profile-metrics-updated", handleProfileUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usernameParam]);

  const resetEditor = () => {
    if (avatarPreview && isBlobUrl(avatarPreview)) {
      URL.revokeObjectURL(avatarPreview);
    }
    setUsername(profile?.username ?? "");
    setBio(profile?.bio ?? "");
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarRemoved(false);
    setEditing(false);
  };

  const onAvatarChange = (file: File | null) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please choose a JPG, PNG, or WebP image.");
      return;
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      setMessage("Image must be 5 MB or smaller.");
      return;
    }

    if (avatarPreview && isBlobUrl(avatarPreview)) {
      URL.revokeObjectURL(avatarPreview);
    }

    setMessage("");
    setAvatarFile(file);
    setAvatarRemoved(false);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const removeAvatar = () => {
    if (avatarPreview && isBlobUrl(avatarPreview)) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarRemoved(true);
  };

  const saveProfile = async () => {
    if (!profile || !session?.user) return;

    setSaving(true);
    setMessage("");

    try {
      const cleanedUsername = username.trim().toLowerCase();
      const cleanedBio = bio.trim();

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

      if (cleanedBio.length > MAX_BIO_LENGTH) {
        setMessage("Bio must be 500 characters or less.");
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

      let nextAvatarUrl = profile.avatar_url;

      if (avatarRemoved) {
        nextAvatarUrl = null;
      }

      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${session.user.id}/${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("profile-avatars")
          .upload(path, avatarFile, {
            upsert: true,
            contentType: avatarFile.type,
          });

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from("profile-avatars")
          .getPublicUrl(path);

        nextAvatarUrl = publicData.publicUrl;
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: { username: cleanedUsername },
      });
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          username: cleanedUsername,
          bio: cleanedBio || null,
          avatar_url: nextAvatarUrl,
        })
        .eq("id", profile.id);
      if (profileError) throw profileError;

      const { data: refreshed } = await supabase.auth.getSession();
      if (!mountedRef.current) return;

      if (avatarPreview && isBlobUrl(avatarPreview)) {
        URL.revokeObjectURL(avatarPreview);
      }

      setSession(refreshed.session);
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              username: cleanedUsername,
              bio: cleanedBio || null,
              avatar_url: nextAvatarUrl,
            }
          : prev,
      );
      setUsername(cleanedUsername);
      setBio(cleanedBio);
      setAvatarFile(null);
      setAvatarPreview(null);
      setAvatarRemoved(false);
      setEditing(false);
      setMessage("Profile updated.");
      window.dispatchEvent(new CustomEvent("profile-updated"));
      router.replace(`/profile/${cleanedUsername}`);
      router.refresh();
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

  const activeAvatarUrl = avatarPreview || profile?.avatar_url || null;
  const activeBio = editing ? bio : profile?.bio?.trim() || "";

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

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 text-2xl font-semibold text-slate-100">
                {activeAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={activeAvatarUrl}
                    alt={`${profile.username} avatar`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  getInitials(profile.username)
                )}
              </div>

              <div>
                <div className="text-sm uppercase tracking-wide text-slate-400">
                  Public profile
                </div>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
                  {profile.username}
                </h1>
                {activeBio ? (
                  <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-slate-300 sm:text-base">
                    {activeBio}
                  </p>
                ) : (
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                    This player has not written a bio yet.
                  </p>
                )}
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                  This profile is visible to everyone. Only the owner can edit the
                  account details.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={shareProfile}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
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

        {editing && isOwner ? (
          <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-wide text-slate-400">
                  Edit profile
                </div>
                <h2 className="mt-1 text-xl font-semibold">Owner controls</h2>
              </div>
              <button
                onClick={resetEditor}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 transition hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
              <div className="space-y-3">
                <div className="flex h-52 w-full items-center justify-center overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 text-4xl font-semibold text-slate-100">
                  {avatarPreview || profile.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={avatarPreview || profile.avatar_url || ""}
                      alt="Profile avatar preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    getInitials(profile.username)
                  )}
                </div>

                <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-slate-800">
                  <ImagePlus className="h-4 w-4" />
                  Choose picture
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/webp"
                    className="hidden"
                    onChange={(e) => onAvatarChange(e.target.files?.[0] ?? null)}
                  />
                </label>

                <button
                  type="button"
                  onClick={removeAvatar}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove picture
                </button>

                <p className="text-xs leading-5 text-slate-500">
                  PNG, JPG, or WebP. Max 5 MB.
                </p>
              </div>

              <div className="space-y-4">
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
                    Bio
                  </label>
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    rows={6}
                    maxLength={MAX_BIO_LENGTH}
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
                    placeholder="Tell people a little about yourself..."
                  />
                  <div className="mt-2 text-xs text-slate-500">
                    {bio.length}/{MAX_BIO_LENGTH}
                  </div>
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
            The public profile now supports an avatar and bio. Next, you can add
            club membership, friends, and recent activity while keeping edit
            access locked to the owner.
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
