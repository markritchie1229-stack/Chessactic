"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { Inbox, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { isAdmin } from "@/lib/admin";

export function AdminModerationRail() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      setSession(data.session);
      setReady(true);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setReady(true);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!ready || !isAdmin(session?.user.id)) {
    return null;
  }

  return (
    <div className="relative z-20">
      <div className="flex w-[72px] flex-col items-center gap-3 rounded-3xl border border-slate-800 bg-slate-900/80 py-4 shadow-lg">
        <button
          type="button"
          onClick={() => router.push("/social/admin/moderation?tab=reports")}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 transition hover:bg-slate-800"
          aria-label="Open admin report inbox"
          title="Report inbox"
        >
          <Inbox className="h-6 w-6" />
        </button>

        <button
          type="button"
          onClick={() => router.push("/social/admin/moderation?tab=actions")}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 transition hover:bg-slate-800"
          aria-label="Open admin actions"
          title="Admin actions"
        >
          <ShieldAlert className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}