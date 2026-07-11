import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/signup?error=missing_code", origin));
  }

  const supabase = await createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      new URL(`/signup?error=${encodeURIComponent(exchangeError.message)}`, origin)
    );
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.redirect(new URL("/signup?error=user_missing", origin));
  }

  const user = userData.user;
  const username = user.user_metadata?.username?.trim();
  const email = user.email?.trim();

  if (username && email) {
    await supabase.from("profiles").upsert(
      {
        id: user.id,
        username,
        email,
      },
      { onConflict: "id" }
    );
  }

  return NextResponse.redirect(new URL("/", origin));
}