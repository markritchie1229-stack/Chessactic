"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export function ClosedAccountGuard() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    const check = async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("account_status")
        .eq("id", session.user.id)
        .maybeSingle();

      if (!mounted) return;

      if (profile?.account_status === "closed") {
        await supabase.auth.signOut({ scope: "global" });
        router.replace("/auth/closed");
      }
    };

    void check();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void (async () => {
        if (!nextSession) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("account_status")
          .eq("id", nextSession.user.id)
          .maybeSingle();

        if (!mounted) return;

        if (profile?.account_status === "closed") {
          await supabase.auth.signOut({ scope: "global" });
          router.replace("/auth/closed");
        }
      })();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return null;
}