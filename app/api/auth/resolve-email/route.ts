import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { identifier?: string };
    const identifier = body.identifier?.trim().toLowerCase();

    if (!identifier) {
      return NextResponse.json(
        { error: "Missing username or email." },
        { status: 400 }
      );
    }

    if (identifier.includes("@")) {
      return NextResponse.json({ email: identifier });
    }

    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("username", identifier)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data?.email) {
      return NextResponse.json(
        { error: "That username was not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ email: data.email.trim().toLowerCase() });
  } catch {
    return NextResponse.json(
      { error: "Could not resolve login identifier." },
      { status: 500 }
    );
  }
}