"use client";

import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export default function AuthBar() {
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async (nextSession: Session | null) => {
      setSession(nextSession);

      if (!nextSession) {
        setDisplayName("");
        setLoading(false);
        return;
      }

      const fallbackName =
        nextSession.user.user_metadata?.username ??
        nextSession.user.email ??
        "Player";

      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", nextSession.user.id)
        .maybeSingle();

      if (mounted) {
        setDisplayName(data?.username ?? fallbackName);
        setLoading(false);
      }
    };

    const getInitialSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted) {
        void loadProfile(data.session);
      }
    };

    void getInitialSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void loadProfile(nextSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 text-sm text-slate-400">
        Checking sign-in status...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3">
        <div className="text-sm text-slate-300">You are not signed in.</div>
        <a
          href="/signup"
          className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-white"
        >
          Log in
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-sm text-slate-300">
        Signed in as <span className="font-medium">{displayName}</span>
      </div>
      <button
        onClick={handleLogout}
        className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
      >
        Log out
      </button>
    </div>
  );
}