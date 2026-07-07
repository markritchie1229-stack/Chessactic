"use client";

import { Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export default function ClubSearch() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const value = searchParams.get("q") ?? "";

  function handleSearch(query: string) {
    const params = new URLSearchParams(searchParams);

    if (query.trim()) {
      params.set("q", query);
    } else {
      params.delete("q");
    }

    startTransition(() => {
      router.replace(`/social/clubs?${params.toString()}`);
    });
  }

  return (
    <div className="relative mb-5">
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />

      <input
        defaultValue={value}
        placeholder="Search clubs..."
        className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 py-3 pl-11 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
        onChange={(e) => handleSearch(e.target.value)}
      />

      {isPending && (
        <p className="mt-2 text-xs text-slate-500">
          Searching...
        </p>
      )}
    </div>
  );
}