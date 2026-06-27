"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { UserCircle2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ProfileRow = {
  username: string | null;
  email: string | null;
  created_at: string | null;
  last_login: string | null;
  last_seen: string | null;
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function AccountRail() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [username, setUsername] = useState("");
  const [joinedAt, setJoinedAt] = useState<string | null>(null);
  const [lastLoginAt, setLastLoginAt] = useState<string | null>(null);
  const [lastSeenAt, setLastSeenAt] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  const touchLastSeen = async (userId: string) => {
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("profiles")
      .update({ last_seen: nowIso })
      .eq("id", userId);

    if (!error) {
      setLastSeenAt(nowIso);
    }
  };

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      const nextSession = data.session;

      if (!mounted) return;

      setSession(nextSession);

      if (!nextSession) {
        setUsername("");
        setJoinedAt(null);
        setLastLoginAt(null);
        setLastSeenAt(null);
        return;
      }

      const fallbackName =
        nextSession.user.user_metadata?.username?.trim().toLowerCase() ??
        nextSession.user.email?.trim().toLowerCase() ??
        "Player";

      const { data: profile } = await supabase
        .from("profiles")
        .select("username,email,created_at,last_login,last_seen")
        .eq("id", nextSession.user.id)
        .maybeSingle();

      if (!mounted) return;

      const row = profile as ProfileRow | null;

      setUsername(row?.username?.trim().toLowerCase() ?? fallbackName);
      setJoinedAt(row?.created_at ?? nextSession.user.created_at ?? null);
      setLastLoginAt(row?.last_login ?? null);
      setLastSeenAt(row?.last_seen ?? null);

      void touchLastSeen(nextSession.user.id);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (!nextSession) {
        setUsername("");
        setJoinedAt(null);
        setLastLoginAt(null);
        setLastSeenAt(null);
        return;
      }

      const fallbackName =
        nextSession.user.user_metadata?.username?.trim().toLowerCase() ??
        nextSession.user.email?.trim().toLowerCase() ??
        "Player";

      void (async () => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username,email,created_at,last_login,last_seen")
          .eq("id", nextSession.user.id)
          .maybeSingle();

        const row = profile as ProfileRow | null;

        setUsername(row?.username?.trim().toLowerCase() ?? fallbackName);
        setJoinedAt(row?.created_at ?? nextSession.user.created_at ?? null);
        setLastLoginAt(row?.last_login ?? null);
        setLastSeenAt(row?.last_seen ?? null);

        void touchLastSeen(nextSession.user.id);
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session) return;

    void touchLastSeen(session.user.id);

    const interval = window.setInterval(() => {
      void touchLastSeen(session.user.id);
    }, 5 * 60 * 1000);

    return () => window.clearInterval(interval);
  }, [session]);

  const handleSaveUsername = async () => {
    setSaving(true);
    setMessage("");

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const user = userData.user;
      if (!user) {
        setMessage("You must be logged in.");
        return;
      }

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

      const currentUsername =
        session?.user.user_metadata?.username?.trim().toLowerCase() ?? "";

      if (cleaned !== currentUsername) {
        const { data: usernameTaken, error: usernameCheckError } =
          await supabase.rpc("is_username_taken", {
            p_username: cleaned,
          });

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
        .eq("id", user.id);

      if (profileError) throw profileError;

      const { data: refreshed } = await supabase.auth.getSession();
      setSession(refreshed.session);
      setMessage("Username updated.");
    } catch (err: any) {
      if (
        err?.code === "23505" ||
        err?.message?.includes("profiles_username_key")
      ) {
        setMessage("Username is already taken.");
        return;
      }

      setMessage(err?.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUsername("");
    setJoinedAt(null);
    setLastLoginAt(null);
    setLastSeenAt(null);
    setOpen(false);
    router.push("/");
    router.refresh();
  };

  const displayName =
    session?.user.user_metadata?.username?.trim() ||
    session?.user.email?.trim() ||
    "Account";

  const panel =
    open && hydrated
      ? createPortal(
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] bg-black/40"
              aria-label="Close account panel"
            />

            <aside className="fixed left-[88px] top-6 z-[70] w-[320px] rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between">
                <div className="text-sm uppercase tracking-wide text-slate-400">
                  Account
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
                  aria-label="Close account panel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {session ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                    <div className="text-sm text-slate-400">Signed in as</div>
                    <div className="mt-1 font-medium text-slate-100">
                      {displayName}
                    </div>
                    <div className="mt-1 text-sm text-slate-500">
                      {session.user.email}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 text-sm">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="text-slate-500">Joined</div>
                      <div className="mt-1 font-medium text-slate-100">
                        {formatDateTime(joinedAt)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="text-slate-500">Last login</div>
                      <div className="mt-1 font-medium text-slate-100">
                        {formatDateTime(lastLoginAt)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                      <div className="text-slate-500">Last seen</div>
                      <div className="mt-1 font-medium text-slate-100">
                        {formatDateTime(lastSeenAt)}
                      </div>
                    </div>
                  </div>

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

                  <button
                    onClick={handleSaveUsername}
                    disabled={saving}
                    className="w-full rounded-2xl bg-slate-100 px-4 py-3 font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save username"}
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 font-medium text-slate-100 transition hover:bg-slate-800"
                  >
                    Log out
                  </button>

                  {message ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                      {message}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                    You are not logged in.
                  </div>

                  <button
                    onClick={() => router.push("/signup")}
                    className="block w-full rounded-2xl bg-slate-100 px-4 py-3 text-center font-medium text-slate-950 transition hover:bg-white"
                  >
                    Log in / Sign up
                  </button>
                </div>
              )}
            </aside>
          </>,
          document.body,
        )
      : null;

  return (
    <div className="relative z-20">
      <div className="flex w-[72px] flex-col items-center rounded-3xl border border-slate-800 bg-slate-900/80 py-4 shadow-lg">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 transition hover:bg-slate-800"
          aria-label="Open account panel"
        >
          <UserCircle2 className="h-6 w-6" />
        </button>
      </div>

      {panel}
    </div>
  );
}