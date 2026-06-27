"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AuthCallbackPage() {
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

      if (data.session && username) {
        const { error: profileError } = await supabase.from("profiles").upsert(
          {
            id: data.session.user.id,
            username,
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 px-6 py-5 text-sm text-slate-300">
        {message}
      </div>
    </main>
  );
}