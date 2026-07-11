import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const { searchParams, origin, href } = url;
  const code = searchParams.get("code");

  console.log("[auth/callback] request:", href);
  console.log("[auth/callback] code present:", Boolean(code));

  if (!code) {
    console.warn("[auth/callback] missing code");
    return NextResponse.redirect(new URL("/signup?error=missing_code", origin));
  }

  try {
    const supabase = await createClient();

    console.log("[auth/callback] starting exchangeCodeForSession");

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    console.log("[auth/callback] exchange result:", {
      hasSession: Boolean(data.session),
      userId: data.session?.user?.id ?? null,
      error: error?.message ?? null,
    });

    if (error) {
      console.error("[auth/callback] exchange error:", error);
      return NextResponse.redirect(
        new URL(`/signup?error=${encodeURIComponent(error.message)}`, origin),
      );
    }

    if (!data.session?.user) {
      console.error("[auth/callback] no session returned");
      return NextResponse.redirect(
        new URL("/signup?error=no_session_returned", origin),
      );
    }

    return NextResponse.redirect(new URL("/account", origin));
  } catch (err) {
    console.error("[auth/callback] unexpected error:", err);

    const message = err instanceof Error ? err.message : "Unknown callback error";
    return NextResponse.redirect(
      new URL(`/signup?error=${encodeURIComponent(message)}`, origin),
    );
  }
}