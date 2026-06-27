"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("Completing sign-in...");

  useEffect(() => {
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

      const username = data.session?.user.user_metadata?.username?.trim();
      const email = data.session?.user.email?.trim();

      if (data.session && username && email) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: data.session.user.id,
            username,
            email,
          },
          { onConflict: "id" }
        );

        if (profileError) {
          setMessage(profileError.message);
          return;
        }
      }

      router.push("/");
      router.refresh();
    };

    void run();
  }, [router, searchParams]);

  return <span>{message}</span>;
}