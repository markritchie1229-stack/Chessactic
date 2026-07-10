"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { Flag } from "lucide-react";
import { supabase } from "@/lib/supabase";

export function ReportRail() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(data.session);
    };

    void loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleOpenReport = () => {
    if (!session) {
      router.push("/signup");
      return;
    }

    router.push("/social/report");
  };

  return (
    <div className="relative z-20">
      <div className="flex w-[72px] flex-col items-center rounded-3xl border border-slate-800 bg-slate-900/80 py-4 shadow-lg">
        <button
          type="button"
          onClick={handleOpenReport}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 transition hover:bg-slate-800"
          aria-label="Open report page"
          title="Report"
        >
          <Flag className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}