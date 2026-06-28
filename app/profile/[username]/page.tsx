"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { Check, Copy, PencilLine, Save, X } from "lucide-react";
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
  const [copied, setCopied] = useState(false);
  const mountedRef = useRef(true);

  const isOwner = Boolean(session?.user.id && profile?.id === session.user.id);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
    };
  }, []);

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
        "id,username,created_at,last_seen,games_solved,current_streak,longest_streak,puzzle_rating,accuracy,favorite_theme",
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

  const saveUsername = async () => {
    if (!profile || !session?.user) return;

    setSaving(true);
    setMessage("");

    try {
      const cleaned = username.trim().toLowerCase();

      if (!cleaned) {
        setMessage("Username cannot be empty.");
        return;
      }

      if (cleaned.length < 3) {
        setMessage("Username must be at least 3 characters.");
        return;
      }

      if (!/^[a-z0-9_]+$/.test(cleaned)) {
        setMessage("Use only letters, numbers, and underscores.");
        return;
      }

      if (cleaned !== profile.username?.trim().toLowerCase()) {
        const { data: usernameTaken, error: usernameCheckError } = await supabase.rpc(
          "is_username_taken",
          {
            p_username: cleaned,
          },
        );

        if (usernameCheckError) throw usernameCheckError;

        if (usernameTaken) {
          setMessage("Username is already taken.");
          return;
        }
      }

      const { error: authError } = await supabase.auth.updateUser({
        data: { username: cleaned },
      });
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ username: cleaned })
        .eq("id", profile.id);
      if (profileError) throw profileError;

      const { data: refreshed } = await supabase.auth.getSession();
      setSession(refreshed.session);
      setProfile((prev) => (prev ? { ...prev, username: cleaned } : prev));
      setUsername(cleaned);
      setEditing(false);
      setMessage("Profile updated.");
      window.dispatchEvent(new CustomEvent("profile-updated"));
      router.replace(`/profile/${cleaned}`);
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
      await navigator.clipboard.writeText(`${window.location.origin}/profile/${profile.username}`);
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
          <p className="mt-3 text-slate-400">{message || "That profile does not exist."}</p>
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
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
                onClick={() => {
                  setEditing(false);
                  setUsername(profile.username ?? "");
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 transition hover:bg-slate-800"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>

            <div className="mt-4 space-y-4">
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

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={saveUsername}
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
            This is a public profile shell. Next we can add bio, avatar, club
            membership, friends, and recent activity, while keeping edit access
            locked to the owner.
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
