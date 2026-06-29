"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function SocialProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setMessage("");

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        setProfile(null);
        setLoading(false);
        setMessage("Sign in to view your profile.");
        return;
      }

      const { data: row, error } = await supabase
        .from("profiles")
        .select("id,username,created_at,last_seen,avatar_url,bio")
        .eq("id", session.user.id)
        .maybeSingle();

      if (error) {
        setProfile(null);
        setMessage(error.message);
      } else {
        setProfile((row as ProfileRow | null) ?? null);
      }

      setLoading(false);
    };

    void load();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="text-sm uppercase tracking-wide text-slate-400">Social</div>
          <h1 className="mt-2 text-3xl font-semibold">Profile</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Your public profile and account summary.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          Loading profile...
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="space-y-6">
        <div>
          <div className="text-sm uppercase tracking-wide text-slate-400">Social</div>
          <h1 className="mt-2 text-3xl font-semibold">Profile</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Your public profile and account summary.
          </p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6">
          <p className="text-sm text-slate-400">{message || "Profile not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm uppercase tracking-wide text-slate-400">Social</div>
        <h1 className="mt-2 text-3xl font-semibold">Profile</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Your public profile and account summary.
        </p>
      </div>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <div className="flex items-start gap-4">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-slate-700 bg-slate-950 text-2xl font-semibold text-slate-100">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt="Profile avatar"
                className="h-full w-full object-cover"
              />
            ) : (
              getInitials(profile.username)
            )}
          </div>

          <div>
            <h2 className="text-2xl font-semibold">{profile.username ?? "Player"}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Last seen {formatDate(profile.last_seen)}
            </p>
            {profile.bio ? (
              <p className="mt-3 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {profile.bio}
              </p>
            ) : (
              <p className="mt-3 text-sm text-slate-400">No bio yet.</p>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="text-slate-500">Joined</div>
            <div className="mt-1 font-medium text-slate-100">
              {formatDate(profile.created_at)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="text-slate-500">Account</div>
            <div className="mt-1 font-medium text-slate-100">Public profile</div>
          </div>
        </div>

        {profile.username ? (
          <button
            type="button"
            onClick={() => router.push(`/profile/${profile.username?.toLowerCase()}`)}
            className="mt-6 rounded-2xl bg-slate-100 px-4 py-3 font-medium text-slate-950 transition hover:bg-white"
          >
            Open full profile
          </button>
        ) : null}
      </section>
    </div>
  );
}