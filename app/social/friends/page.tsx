"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { SocialPageShell } from "../_components/SocialPageShell";

type FriendProfile = {
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

export default function SocialFriendsPage() {
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        setFriends([]);
        setLoading(false);
        return;
      }

      const { data: connectionRows, error } = await supabase
        .from("friend_connections")
        .select("user_low_id,user_high_id,status")
        .eq("status", "accepted")
        .or(`user_low_id.eq.${session.user.id},user_high_id.eq.${session.user.id}`);

      if (!error) {
        const friendIds = Array.from(
          new Set(
            (connectionRows ?? []).map((row: any) =>
              row.user_low_id === session.user.id ? row.user_high_id : row.user_low_id,
            ),
          ),
        );

        if (friendIds.length > 0) {
          const { data: profileRows } = await supabase
            .from("profiles")
            .select("id,username,last_seen,avatar_url,bio")
            .in("id", friendIds);

          setFriends((profileRows as FriendProfile[] | null) ?? []);
        } else {
          setFriends([]);
        }
      }

      setLoading(false);
    };

    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return friends;
    return friends.filter((friend) => {
      const username = friend.username?.toLowerCase() ?? "";
      const bio = friend.bio?.toLowerCase() ?? "";
      return username.includes(term) || bio.includes(term);
    });
  }, [friends, query]);

  return (
    <SocialPageShell title="Friends" subtitle="Your accepted friends list.">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search friends"
        className="mb-4 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
      />

      {loading ? (
        <div className="text-sm text-slate-400">Loading friends...</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-slate-400">No friends found.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((friend) => (
            <div
              key={friend.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-sm font-semibold">
                    {friend.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={friend.avatar_url}
                        alt={friend.username ?? "Friend avatar"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      getInitials(friend.username)
                    )}
                  </div>
                  <div>
                    <div className="font-medium text-slate-100">
                      {friend.username ?? "Player"}
                    </div>
                    <div className="text-sm text-slate-500">
                      {friend.last_seen ? `Last seen ${formatDate(friend.last_seen)}` : "Friend"}
                    </div>
                  </div>
                </div>

                {friend.username ? (
                  <Link
                    href={`/profile/${friend.username.toLowerCase()}`}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 transition hover:bg-slate-800"
                  >
                    View
                  </Link>
                ) : null}
              </div>

              {friend.bio?.trim() ? (
                <p className="mt-3 text-sm leading-6 text-slate-400">{friend.bio}</p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </SocialPageShell>
  );
}