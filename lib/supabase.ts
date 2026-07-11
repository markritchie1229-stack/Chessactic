import { createBrowserClient } from "@supabase/ssr";

console.log("SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log(
  "SUPABASE_KEY_EXISTS:",
  !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseKey);