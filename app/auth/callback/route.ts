import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/signup?callback_error=Missing authentication code", origin)
    );
  }

  try {
    const supabase = await createClient();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(
        new URL(
          `/signup?callback_error=${encodeURIComponent(error.message)}`,
          origin
        )
      );
    }

    return NextResponse.redirect(new URL("/account", origin));
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown callback error";

    return NextResponse.redirect(
      new URL(
        `/signup?callback_error=${encodeURIComponent(message)}`,
        origin
      )
    );
  }
}