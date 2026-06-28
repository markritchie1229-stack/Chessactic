"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowUpRight,
  Bell,
  Hash,
  MessageSquareMore,
  Shield,
  UserCircle2,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type ProfileSummary = {
  username: string | null;
  created_at: string | null;
  last_seen: string | null;
};

type TabKey = "profile" | "messages" | "friends" | "clubs" | "forum";

type TabItem = {
  key: TabKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

const tabs: TabItem[] = [
  { key: "profile", label: "Public profile", icon: UserCircle2 },
  { key: "messages", label: "Messages", icon: MessageSquareMore },
  { key: "friends", label: "Friends", icon: Users },
  { key: "clubs", label: "Clubs", icon: Shield },
  { key: "forum", label: "Forum", icon: Hash },
];

const sampleMessages = [
  {
    from: "CoachMira",
    title: "Nice win yesterday",
    body: "Your kingside attack was sharp. Want to go over the final position?",
    unread: true,
  },
  {
    from: "Club Admin",
    title: "Weekend rapid event",
    body: "We are running a 10+0 tournament on Saturday afternoon.",
    unread: false,
  },
  {
    from: "PuzzleBuddy",
    title: "Study group invite",
    body: "A few of us are doing endgame drills tonight if you want in.",
    unread: false,
  },
];

const sampleFriends = [
  { name: "Ava", status: "Online now" },
  { name: "Noah", status: "Playing rapid" },
  { name: "Mila", status: "Last seen 12m ago" },
];

const sampleClubs = [
  {
    name: "Tactical Tuesdays",
    meta: "248 members",
    desc: "Weekly tactics battles and analysis",
  },
  {
    name: "Endgame Lab",
    meta: "91 members",
    desc: "King, pawn, and rook endgames",
  },
  {
    name: "Weekend Blitzers",
    meta: "1.2k members",
    desc: "Fast games, ladders, and arenas",
  },
];

const sampleTopics = [
  {
    title: "Best way to convert extra piece endgames?",
    meta: "Endgames · 24 replies",
  },
  {
    title: "Opening prep for the French defense",
    meta: "Openings · 18 replies",
  },
  {
    title: "Show your favorite mating net",
    meta: "Middlegame · 41 replies",
  },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function SocialRail() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const { data } = await supabase.auth.getSession();
      const nextSession = data.session;

      if (!alive) return;
      setSession(nextSession);

      if (!nextSession) {
        setProfile(null);
        return;
      }

      const { data: row } = await supabase
        .from("profiles")
        .select("username,created_at,last_seen")
        .eq("id", nextSession.user.id)
        .maybeSingle();

      if (!alive) return;
      setProfile((row as ProfileSummary | null) ?? null);
    };

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);

      if (!nextSession) {
        setProfile(null);
        return;
      }

      void (async () => {
        const { data: row } = await supabase
          .from("profiles")
          .select("username,created_at,last_seen")
          .eq("id", nextSession.user.id)
          .maybeSingle();

        if (!alive) return;
        setProfile((row as ProfileSummary | null) ?? null);
      })();
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  const displayName =
    session?.user.user_metadata?.username?.trim() ||
    session?.user.email?.trim() ||
    "Player";

  const username = profile?.username?.trim().toLowerCase() ?? "";
  const profileLink = username ? `/profile/${username}` : null;

  const stats = useMemo(
    () => [
      { label: "Messages", value: "3" },
      { label: "Friends", value: "28" },
      { label: "Clubs", value: "4" },
      { label: "Forum posts", value: "17" },
    ],
    [],
  );

  const body =
    open && mounted
      ? createPortal(
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] bg-black/40"
              aria-label="Close social panel"
            />

            <aside className="fixed left-[88px] top-[104px] z-[70] w-[420px] max-w-[calc(100vw-112px)] rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between">
                <div className="text-sm uppercase tracking-wide text-slate-400">
                  Social
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
                  aria-label="Close social panel"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {!session ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                    Sign in to view your profile, messages, friends, clubs, and forum.
                  </div>
                  <button
                    onClick={() => router.push("/signup")}
                    className="block w-full rounded-2xl bg-slate-100 px-4 py-3 text-center font-medium text-slate-950 transition hover:bg-white"
                  >
                    Log in / Sign up
                  </button>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {stats.map((item) => (
                      <div
                        key={item.label}
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3"
                      >
                        <div className="text-xs text-slate-500">{item.label}</div>
                        <div className="mt-1 text-lg font-semibold text-slate-100">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const active = activeTab === tab.key;

                      return (
                        <button
                          key={tab.key}
                          type="button"
                          onClick={() => setActiveTab(tab.key)}
                          className={`inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition ${
                            active
                              ? "border-slate-100 bg-slate-100 text-slate-950"
                              : "border-slate-800 bg-slate-950/60 text-slate-200 hover:bg-slate-800"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {activeTab === "profile" ? (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                        <div className="text-sm text-slate-400">Public profile</div>
                        <div className="mt-1 text-xl font-semibold text-slate-100">
                          {displayName}
                        </div>
                        <div className="mt-1 text-sm text-slate-500">
                          {session.user.email}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                          <div className="text-slate-500">Joined</div>
                          <div className="mt-1 font-medium text-slate-100">
                            {formatDate(profile?.created_at ?? session.user.created_at)}
                          </div>
                        </div>
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                          <div className="text-slate-500">Last seen</div>
                          <div className="mt-1 font-medium text-slate-100">
                            {formatDate(profile?.last_seen)}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (!profileLink) return;
                          router.push(profileLink);
                          setOpen(false);
                        }}
                        disabled={!profileLink}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Open full profile
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                    </div>
                  ) : null}

                  {activeTab === "messages" ? (
                    <div className="space-y-3">
                      {sampleMessages.map((message) => (
                        <div
                          key={`${message.from}-${message.title}`}
                          className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium text-slate-100">
                                {message.title}
                              </div>
                              <div className="text-sm text-slate-500">
                                From {message.from}
                              </div>
                            </div>

                            {message.unread ? (
                              <span className="rounded-full bg-blue-500/15 px-2 py-1 text-xs text-blue-300">
                                New
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-3 text-sm leading-6 text-slate-300">
                            {message.body}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {activeTab === "friends" ? (
                    <div className="space-y-3">
                      {sampleFriends.map((friend) => (
                        <div
                          key={friend.name}
                          className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3"
                        >
                          <div>
                            <div className="font-medium text-slate-100">
                              {friend.name}
                            </div>
                            <div className="text-sm text-slate-500">
                              {friend.status}
                            </div>
                          </div>
                          <button className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 transition hover:bg-slate-800">
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {activeTab === "clubs" ? (
                    <div className="space-y-3">
                      {sampleClubs.map((club) => (
                        <div
                          key={club.name}
                          className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="font-medium text-slate-100">
                                {club.name}
                              </div>
                              <div className="text-sm text-slate-500">
                                {club.meta}
                              </div>
                            </div>
                            <UsersRound className="h-5 w-5 text-slate-500" />
                          </div>
                          <div className="mt-3 text-sm leading-6 text-slate-300">
                            {club.desc}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {activeTab === "forum" ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-400">
                        <Bell className="h-4 w-4" />
                        Trending topics
                      </div>

                      {sampleTopics.map((topic) => (
                        <div
                          key={topic.title}
                          className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                        >
                          <div className="font-medium text-slate-100">
                            {topic.title}
                          </div>
                          <div className="mt-1 text-sm text-slate-500">
                            {topic.meta}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </aside>
          </>,
          document.body,
        )
      : null;

  return (
    <div className="relative z-20">
      <div className="flex w-[72px] flex-col items-center rounded-3xl border border-slate-800 bg-slate-900/80 py-4 shadow-lg">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 transition hover:bg-slate-800"
          aria-label="Open social panel"
        >
          <MessageSquareMore className="h-6 w-6" />
        </button>
      </div>

      {body}
    </div>
  );
}