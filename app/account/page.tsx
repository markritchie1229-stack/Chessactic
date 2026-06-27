"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function AccountPage() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [savingUsername, setSavingUsername] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      const currentUsername =
        data.session?.user.user_metadata?.username?.trim().toLowerCase() ?? "";
      setUsername(currentUsername);

      setLoading(false);
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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const handleUsernameSave = async () => {
    setSavingUsername(true);
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

      const { data: refreshedSession } = await supabase.auth.getSession();
      setSession(refreshedSession.session);
      setMessage("Username updated.");
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : "Something went wrong.";
      setMessage(text);
    } finally {
      setSavingUsername(false);
    }
  };

  const handlePasswordChange = async () => {
    setChangingPassword(true);
    setMessage("");

    try {
      if (!password.trim()) {
        setMessage("Enter a new password.");
        return;
      }

      if (password.trim().length < 6) {
        setMessage("Password must be at least 6 characters.");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (error) throw error;

      setPassword("");
      setMessage("Password updated.");
    } catch (err: unknown) {
      const text = err instanceof Error ? err.message : "Something went wrong.";
      setMessage(text);
    } finally {
      setChangingPassword(false);
    }
  };

  const displayName =
    session?.user.user_metadata?.username?.trim() ||
    session?.user.email?.trim() ||
    "Account";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 px-6 py-5 text-sm text-slate-300">
          Loading account...
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
          <h1 className="text-3xl font-semibold">Account</h1>
          <p className="mt-2 text-sm text-slate-400">
            Please log in to edit your username.
          </p>

          <button
            onClick={() => router.push("/signup")}
            className="mt-6 w-full rounded-2xl bg-slate-100 px-4 py-3 font-medium text-slate-950 transition hover:bg-white"
          >
            Log in / Sign up
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold">Account</h1>
            <p className="mt-2 text-sm text-slate-400">
              Manage your username and password.
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
          >
            Log out
          </button>
        </div>

        <div className="mt-6 space-y-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="text-sm text-slate-400">Signed in as</div>
            <div className="mt-1 text-lg font-medium">{displayName}</div>
            <div className="mt-1 text-sm text-slate-500">
              {session.user.email}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <label className="mb-2 block text-sm text-slate-300">
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="new_username"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
            />
            <button
              onClick={handleUsernameSave}
              disabled={savingUsername}
              className="mt-4 rounded-2xl bg-slate-100 px-4 py-3 font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingUsername ? "Saving..." : "Save username"}
            </button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <label className="mb-2 block text-sm text-slate-300">
              New password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
            />
            <button
              onClick={handlePasswordChange}
              disabled={changingPassword}
              className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 font-medium text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {changingPassword ? "Updating..." : "Change password"}
            </button>
          </div>

          {message ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
              {message}
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}