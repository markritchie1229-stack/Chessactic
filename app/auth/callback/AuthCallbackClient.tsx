"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

const CLOSED_ACCOUNT_MESSAGE = "Your account has been closed";

export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Completing sign-in...");

  useEffect(() => {
    let active = true;

    const run = async () => {
      const code = searchParams.get("code");

      if (!code) {
        setMessage("Missing authentication code.");
        return;
      }

      const { data, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        setMessage(error.message);
        return;
      }

      const session = data.session;
      if (!session) {
        setMessage("Could not complete sign-in.");
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("account_status")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        setMessage(profileError.message);
        return;
      }

      if (profile?.account_status === "closed") {
        await supabase.auth.signOut({ scope: "global" });
        if (active) {
          setMessage(CLOSED_ACCOUNT_MESSAGE);
        }
        return;
      }

      const username = session.user.user_metadata?.username?.trim();
      const email = session.user.email?.trim();

      if (username && email) {
        const { error: upsertError } = await supabase.from("profiles").upsert(
          {
            id: session.user.id,
            username,
            email,
          },
          { onConflict: "id" },
        );

        if (upsertError) {
          setMessage(upsertError.message);
          return;
        }
      }

      router.replace("/");
      router.refresh();
    };

    void run();

    return () => {
      active = false;
    };
  }, [router, searchParams]);

  return <span>{message}</span>;
}