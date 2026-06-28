"use client";

import { useEffect, useState } from "react";
import { UserCircle2, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export function AccountMenu() {
  const [session, setSession] = useState<Session | null>(null);
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      const currentUsername =
        data.session?.user.user_metadata?.username?.trim().toLowerCase() ?? "";
      setUsername(currentUsername);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      const currentUsername =
        nextSession?.user.user_metadata?.username?.trim().toLowerCase() ?? "";
      setUsername(currentUsername);
    });

    return () => subscription.unsubscribe();
  }, []);

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

      const { data: existing, error: checkError } = await supabase
        .from("profiles")
        .select("id")
        .eq("username", cleaned)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existing && existing.id !== user.id) {
        setMessage("That username is already taken.");
        return;
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
      setUsername(cleaned);
      window.dispatchEvent(new CustomEvent("profile-updated"));
      setMessage("Username updated.");
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUsername("");
    setOpen(false);
  };

  const displayName =
    session?.user.user_metadata?.username?.trim() ||
    session?.user.email?.trim() ||
    "Account";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2 text-slate-100 transition hover:bg-slate-800"
        aria-label="Open account menu"
      >
        <UserCircle2 className="h-5 w-5" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default bg-black/40"
            aria-label="Close account menu overlay"
          />
          <aside className="fixed right-4 top-4 z-50 w-[320px] rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/40">
            <div className="flex items-center justify-between">
              <div className="text-sm uppercase tracking-wide text-slate-400">
                Account
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
                aria-label="Close account menu"
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

                <a
                  href="/signup"
                  className="block rounded-2xl bg-slate-100 px-4 py-3 text-center font-medium text-slate-950 transition hover:bg-white"
                >
                  Log in / Sign up
                </a>
              </div>
            )}
          </aside>
        </>
      ) : null}
    </div>
  );
}