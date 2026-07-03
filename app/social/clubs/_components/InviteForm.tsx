"use client";

import { useState } from "react";
import { Search, UserPlus } from "lucide-react";
import type { ProfileRecord } from "../_lib/types";

type InviteFormProps = {
  results: ProfileRecord[];
  loading?: boolean;
  onSearch: (query: string) => Promise<void> | void;
  onInvite?: (profile: ProfileRecord) => Promise<void> | void;
  canInvite?: boolean;
};

export function InviteForm({
  results,
  loading = false,
  onSearch,
  onInvite,
  canInvite = true,
}: InviteFormProps) {
  const [query, setQuery] = useState("");
  const [sendingId, setSendingId] = useState<string | null>(null);

  const handleSearch = async (value: string) => {
    setQuery(value);
    await onSearch(value);
  };

  const handleInvite = async (profile: ProfileRecord) => {
    if (!canInvite || !onInvite) return;

    try {
      setSendingId(profile.id);
      await onInvite(profile);
    } finally {
      setSendingId(null);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="mb-4 flex items-center gap-3">
        <UserPlus className="h-5 w-5 text-cyan-400" />
        <div>
          <h2 className="text-xl font-semibold">Send an invite</h2>
          <p className="text-sm text-slate-400">
            Search website usernames and send the invite through DMs.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search website usernames"
            className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 py-3 pl-11 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
          />
        </div>

        {loading ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
            Searching...
          </div>
        ) : results.length === 0 && query.trim() ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-4 text-sm text-slate-400">
            No users matched that search.
          </div>
        ) : null}

        <div className="space-y-3">
          {results.map((profile) => {
            const username = profile.username ?? profile.id;

            return (
              <div
                key={profile.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-sm font-semibold text-slate-100">
                      {profile.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={profile.avatar_url}
                          alt={username}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        username.slice(0, 2).toUpperCase()
                      )}
                    </div>

                    <div>
                      <div className="font-medium text-slate-100">{username}</div>
                      <div className="text-xs text-slate-500">{profile.id}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleInvite(profile)}
                    disabled={!canInvite || !onInvite || sendingId === profile.id}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sendingId === profile.id ? "Inviting..." : "Invite"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}