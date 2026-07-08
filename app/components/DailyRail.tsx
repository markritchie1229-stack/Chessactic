import Link from "next/link";
import { CalendarDays } from "lucide-react";

export function DailyRail() {
  return (
    <Link
      href="/daily"
      title="Daily Guess the Elo"
      className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900/80 text-slate-100 transition hover:scale-105 hover:bg-slate-800"
    >
      <CalendarDays className="h-7 w-7" />
    </Link>
  );
}
