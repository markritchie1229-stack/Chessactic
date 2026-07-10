"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import {
  ChevronLeft,
  ChevronRight,
  Flag,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldAlert,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

const SIDEBAR_STORAGE_KEY = "account-sidebar-collapsed";

export function AccountSidebar() {
  const router = useRouter();

  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);

    try {
      const saved = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);
      if (saved === "true") {
        setIsCollapsed(true);
      }
    } catch {
      // Ignore storage errors.
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    try {
      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEY,
        String(isCollapsed),
      );
    } catch {
      // Ignore storage errors.
    }
  }, [isCollapsed, isHydrated]);

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);

      const currentUsername =
        data.session?.user.user_metadata?.username?.trim() ?? "";
      setUsername(currentUsername);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      const currentUsername =
        nextSession?.user.user_metadata?.username?.trim() ?? "";
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

      const cleaned = username.trim();

      if (!cleaned) {
        setMessage("Username cannot be empty.");
        return;
      }

      if (cleaned.length < 3) {
        setMessage("Username must be at least 3 characters.");
        return;
      }

      if (!/^[a-zA-Z0-9_]+$/.test(cleaned)) {
        setMessage("Use only letters, numbers, and underscores.");
        return;
      }

      const currentUsername =
        session?.user.user_metadata?.username?.trim() ?? "";

      if (cleaned.toLowerCase() !== currentUsername.toLowerCase()) {
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
      setUsername(cleaned);
      setMessage("Username updated.");
    } catch (err: unknown) {
      if (
        err &&
        typeof err === "object" &&
        "code" in err &&
        (err as { code?: string }).code === "23505"
      ) {
        setMessage("Username is already taken.");
        return;
      }

      const maybeError = err as { message?: string } | null;
      if (maybeError?.message?.includes("profiles_username_key")) {
        setMessage("Username is already taken.");
        return;
      }

      setMessage(maybeError?.message ?? "Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUsername("");
    router.push("/");
    router.refresh();
  };

  const handleGoToSignup = () => {
    router.push("/signup");
  };

  const displayName =
    session?.user.user_metadata?.username?.trim() ||
    session?.user.email?.trim() ||
    "Account";

  const currentUserIsAdmin = isAdmin(session?.user.id);

  return (
    <aside
      className={`rounded-3xl border border-slate-800 bg-slate-900/80 shadow-lg transition-all duration-300 ${
        isCollapsed ? "w-20 p-3" : "w-full p-5"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        {!isCollapsed ? (
          <div className="text-sm uppercase tracking-wide text-slate-400">
            Account
          </div>
        ) : (
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 text-slate-300">
            A
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-slate-200 transition hover:bg-slate-800"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {isCollapsed ? (
        <div className="mt-4 flex flex-col items-center gap-2">
          <button
            onClick={() => setIsCollapsed(false)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950 text-slate-200 transition hover:bg-slate-800"
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : session ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <span>Signed in as</span>
              {currentUserIsAdmin ? (
                <span className="inline-flex items-center rounded-full border border-sky-500/30 bg-sky-500/15 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-sky-200">
                  Admin
                </span>
              ) : null}
            </div>
            <div className="mt-1 font-medium text-slate-100">{displayName}</div>
            <div className="mt-1 text-sm text-slate-500">{session.user.email}</div>
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-300">Username</label>
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

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={() => router.push("/report")}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 font-medium text-slate-100 transition hover:bg-slate-800"
            >
              <Flag className="h-4 w-4" />
              Report
            </button>

            {currentUserIsAdmin ? (
              <button
                onClick={() => router.push("/admin/moderation")}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 font-medium text-sky-100 transition hover:bg-sky-500/20"
              >
                <ShieldAlert className="h-4 w-4" />
                Admin actions
              </button>
            ) : null}
          </div>

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
            onClick={handleGoToSignup}
            className="block w-full rounded-2xl bg-slate-100 px-4 py-3 text-center font-medium text-slate-950 transition hover:bg-white"
          >
            Log in / Sign up
          </button>
        </div>
      )}
    </aside>
  );
}