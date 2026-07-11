import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(new URL("/signup?error=missing_code", origin));
  }

  const supabase = await createClient();

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    return NextResponse.redirect(
      new URL(`/signup?error=${encodeURIComponent(exchangeError.message)}`, origin)
    );
  }

  const user = data.session?.user;
  if (!user) {
    return NextResponse.redirect(new URL("/signup?error=user_missing", origin));
  }

  const username = user.user_metadata?.username?.trim();
  const email = user.email?.trim();

  if (username && email) {
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        username,
        email,
      },
      { onConflict: "id" }
    );

    if (profileError) {
      return NextResponse.redirect(
        new URL(`/signup?error=${encodeURIComponent(profileError.message)}`, origin)
      );
    }
  }

  return NextResponse.redirect(new URL("/", origin));
}