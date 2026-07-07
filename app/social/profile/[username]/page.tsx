"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type ProfileRow = {
  id: string;
  username: string | null;
  created_at: string | null;
  last_seen: string | null;
  avatar_url: string | null;
  bio: string | null;
};

function getInitials(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "?";

  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? trimmed[0] ?? "?";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";

  return `${first}${second}`.toUpperCase();
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function PublicProfilePage() {
  const router = useRouter();
  const params = useParams<{ username: string }>();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setMessage("");

      const rawUsername = params?.username;

      const username = Array.isArray(rawUsername)
        ? rawUsername[0]
        : rawUsername;

      const cleaned = decodeURIComponent(username ?? "")
        .trim()
        .toLowerCase();

      if (!cleaned) {
        setProfile(null);
        setMessage("Profile not found.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, username, created_at, last_seen, avatar_url, bio"
        )
        .ilike("username", cleaned)
        .maybeSingle();

      console.log("Username:", cleaned);
      console.log("Profile:", data);
      console.log("Error:", error);

      if (error) {
        setMessage(error.message);
        setProfile(null);
      } else {
        setProfile(data as ProfileRow | null);
      }

      setLoading(false);
    }

    void load();
  }, [params]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="text-sm uppercase tracking-wide text-slate-400">
            Social
          </div>

          <h1 className="mt-2 text-3xl font-semibold">
            Profile
          </h1>

          <p className="mt-2 text-sm text-slate-400">
            Loading profile...
          </p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <div className="text-sm uppercase tracking-wide text-slate-400">
            Social
          </div>

          <h1 className="mt-2 text-3xl font-semibold">
            Profile
          </h1>
        </div>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <p className="text-slate-400">
            {message || "Profile not found."}
          </p>

          <button
            onClick={() => router.back()}
            className="mt-6 rounded-xl bg-slate-100 px-4 py-2 font-medium text-slate-900"
          >
            Go Back
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm uppercase tracking-wide text-slate-400">
          Social
        </div>

        <h1 className="mt-2 text-3xl font-semibold">
          {profile.username}
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Public profile
        </p>
      </div>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 text-2xl font-semibold">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.username ?? "Avatar"}
                className="h-full w-full object-cover"
              />
            ) : (
              getInitials(profile.username)
            )}
          </div>

          <div>
            <h2 className="text-2xl font-semibold">
              {profile.username}
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Last seen {formatDate(profile.last_seen)}
            </p>

            <p className="mt-4 whitespace-pre-wrap text-slate-300">
              {profile.bio || "No bio yet."}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="text-slate-500">
              Joined
            </div>

            <div className="mt-1 font-medium">
              {formatDate(profile.created_at)}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="text-slate-500">
              Username
            </div>

            <div className="mt-1 font-medium">
              @{profile.username}
            </div>
          </div>
        </div>

        <button
          onClick={() => router.back()}
          className="mt-6 rounded-xl bg-slate-100 px-4 py-2 font-medium text-slate-900"
        >
          Go Back
        </button>
      </section>
    </div>
  );
}