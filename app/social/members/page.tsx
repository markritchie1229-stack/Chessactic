"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type MemberProfile = {
  id: string;
  username: string | null;
  last_seen: string | null;
  avatar_url: string | null;
  bio: string | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getInitials(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? trimmed[0] ?? "?";
  const second = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return `${first}${second}`.toUpperCase();
}

export default function SocialMembersPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(async () => {
      const term = query.trim();
      if (!term) {
        setResults([]);
        return;
      }

      setLoading(true);

      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,last_seen,avatar_url,bio")
        .or(`username.ilike.%${term}%,bio.ilike.%${term}%`)
        .order("username", { ascending: true })
        .limit(20);

      if (!error) {
        setResults((data as MemberProfile[] | null) ?? []);
      } else {
        setResults([]);
      }

      setLoading(false);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  return (
    <div className="space-y-6">
      <div>
        <div className="text-sm uppercase tracking-wide text-slate-400">Social</div>
        <h1 className="mt-2 text-3xl font-semibold">Members</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
          Search players by username or bio.
        </p>
      </div>

      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search members"
          className="mb-4 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
        />

        {loading ? (
          <div className="text-sm text-slate-400">Searching...</div>
        ) : query.trim() && results.length === 0 ? (
          <div className="text-sm text-slate-400">No members matched that search.</div>
        ) : !query.trim() ? (
          <div className="text-sm text-slate-400">Start typing to find members.</div>
        ) : (
          <div className="space-y-3">
            {results.map((member) => (
              <div
                key={member.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-sm font-semibold">
                      {member.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={member.avatar_url}
                          alt={member.username ?? "Member avatar"}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        getInitials(member.username)
                      )}
                    </div>

                    <div>
                      <div className="font-medium text-slate-100">
                        {member.username ?? "Player"}
                      </div>
                      <div className="text-sm text-slate-500">
                        {member.last_seen ? `Last seen ${formatDate(member.last_seen)}` : "Member"}
                      </div>
                    </div>
                  </div>

                  {member.username ? (
                    <Link
                      href={`/profile/${member.username.toLowerCase()}`}
                      className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 transition hover:bg-slate-800"
                    >
                      View profile
                    </Link>
                  ) : null}
                </div>

                {member.bio?.trim() ? (
                  <p className="mt-3 text-sm leading-6 text-slate-400">{member.bio}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}