import Link from "next/link";
import { Archive } from "lucide-react";

export function DailyArchiveButton() {
  return (
    <Link
      href="/daily/archive"
      className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
    >
      <Archive className="h-4 w-4" />
      Daily Archive
    </Link>
  );
}
