"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowUpRight,
  Bell,
  Hash,
  MessageSquareMore,
  Search,
  Send,
  Shield,
  UserCircle2,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type ProfileSummary = {
  id: string;
  username: string | null;
  created_at: string | null;
  last_seen: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type FriendProfile = {
  id: string;
  username: string | null;
  last_seen: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type MessageThreadRow = {
  id: string;
  user_low_id: string;
  user_high_id: string;
  last_message_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type MessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type TabKey = "profile" | "messages" | "friends" | "members" | "clubs" | "forum";

type TabItem = {
  key: TabKey;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type ThreadSummary = {
  id: string;
  friend: FriendProfile;
  preview: string;
  lastMessageAt: string | null;
};

type ForumThreadRow = {
  id: string;
  author_id: string;
  title: string;
  created_at: string | null;
  updated_at: string | null;
  last_post_at: string | null;
  reply_count: number | null;
  is_pinned: boolean | null;
};

type ForumPostRow = {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  created_at: string;
  updated_at: string | null;
};

const tabs: TabItem[] = [
  { key: "profile", label: "Public profile", icon: UserCircle2 },
  { key: "messages", label: "Messages", icon: MessageSquareMore },
  { key: "friends", label: "Friends", icon: Users },
  { key: "members", label: "Members", icon: Search },
  { key: "clubs", label: "Clubs", icon: Shield },
  { key: "forum", label: "Forum", icon: Hash },
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

function formatThreadPreview(text: string) {
  const cleaned = text.trim();
  if (cleaned.length <= 72) return cleaned;
  return `${cleaned.slice(0, 72).trimEnd()}…`;
}

function sortPair(a: string, b: string) {
  return a < b ? [a, b] : [b, a];
}

function getOtherParticipant(thread: MessageThreadRow, userId: string) {
  return thread.user_low_id === userId ? thread.user_high_id : thread.user_low_id;
}

export function SocialRail() {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [friendFilter, setFriendFilter] = useState("");
  const [memberSearch, setMemberSearch] = useState("");
  const [memberResults, setMemberResults] = useState<FriendProfile[]>([]);
  const [memberSearching, setMemberSearching] = useState(false);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<MessageRow[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");
  const [loading, setLoading] = useState(false);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  const [forumThreads, setForumThreads] = useState<ForumThreadRow[]>([]);
  const [forumPosts, setForumPosts] = useState<ForumPostRow[]>([]);
  const [forumProfiles, setForumProfiles] = useState<FriendProfile[]>([]);
  const [forumActiveThreadId, setForumActiveThreadId] = useState<string | null>(null);
  const [forumSearch, setForumSearch] = useState("");
  const [forumComposerOpen, setForumComposerOpen] = useState(false);
  const [forumThreadTitle, setForumThreadTitle] = useState("");
  const [forumThreadBody, setForumThreadBody] = useState("");
  const [forumReplyBody, setForumReplyBody] = useState("");
  const [forumLoading, setForumLoading] = useState(false);
  const [forumPosting, setForumPosting] = useState(false);

  const loadConversation = useCallback(async (threadId: string) => {
    setConversationLoading(true);

    try {
      const { data, error } = await supabase
        .from("messages")
        .select("id,thread_id,sender_id,body,created_at")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setConversation((data as MessageRow[] | null) ?? []);
    } catch (error) {
      console.warn("Could not load messages:", error);
      setConversation([]);
      setNotice("Could not load that conversation.");
    } finally {
      setConversationLoading(false);
    }
  }, []);

  const loadForumData = useCallback(async (nextActiveThreadId?: string | null) => {
    setForumLoading(true);

    try {
      const { data: threadRowsRaw, error: threadError } = await supabase
        .from("forum_threads")
        .select("id,author_id,title,created_at,updated_at,last_post_at,reply_count,is_pinned")
        .order("is_pinned", { ascending: false })
        .order("last_post_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(50);

      if (threadError) throw threadError;

      const threadRows = (threadRowsRaw as ForumThreadRow[] | null) ?? [];
      const selectedThreadId =
        nextActiveThreadId && threadRows.some((thread) => thread.id === nextActiveThreadId)
          ? nextActiveThreadId
          : forumActiveThreadId && threadRows.some((thread) => thread.id === forumActiveThreadId)
            ? forumActiveThreadId
            : threadRows[0]?.id ?? null;

      let postRows: ForumPostRow[] = [];
      if (selectedThreadId) {
        const { data: postRowsRaw, error: postError } = await supabase
          .from("forum_posts")
          .select("id,thread_id,author_id,body,created_at,updated_at")
          .eq("thread_id", selectedThreadId)
          .order("created_at", { ascending: true });

        if (postError) throw postError;
        postRows = (postRowsRaw as ForumPostRow[] | null) ?? [];
      }

      const authorIds = new Set<string>();
      for (const row of threadRows) {
        if (row.author_id) authorIds.add(row.author_id);
      }
      for (const row of postRows) {
        if (row.author_id) authorIds.add(row.author_id);
      }

      let authorRows: FriendProfile[] = [];
      if (authorIds.size > 0) {
        const { data: profileRows, error: profileError } = await supabase
          .from("profiles")
          .select("id,username,last_seen,avatar_url,bio")
          .in("id", Array.from(authorIds));

        if (profileError) throw profileError;
        authorRows = (profileRows as FriendProfile[] | null) ?? [];
      }

      setForumThreads(threadRows);
      setForumPosts(postRows);
      setForumProfiles(authorRows);
      setForumActiveThreadId(selectedThreadId);
    } catch (error) {
      console.warn("Could not load forum data:", error);
      setForumThreads([]);
      setForumPosts([]);
      setForumProfiles([]);
      setForumActiveThreadId(null);
    } finally {
      setForumLoading(false);
    }
  }, [forumActiveThreadId]);

  const loadSocialData = useCallback(async (nextActiveThreadId?: string | null) => {
    setLoading(true);
    setNotice("");

    try {
      const { data } = await supabase.auth.getSession();
      const nextSession = data.session;
      setSession(nextSession);

      if (!nextSession) {
        setProfile(null);
        setFriends([]);
        setThreads([]);
        setConversation([]);
        setActiveThreadId(null);
        setMemberResults([]);
        setForumThreads([]);
        setForumPosts([]);
        setForumProfiles([]);
        setForumActiveThreadId(null);
        return;
      }

      const { data: profileRow, error: profileError } = await supabase
        .from("profiles")
        .select("id,username,created_at,last_seen,avatar_url,bio")
        .eq("id", nextSession.user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile((profileRow as ProfileSummary | null) ?? null);

      const { data: connectionRows, error: connectionError } = await supabase
        .from("friend_connections")
        .select("user_low_id,user_high_id,status")
        .eq("status", "accepted")
        .or(`user_low_id.eq.${nextSession.user.id},user_high_id.eq.${nextSession.user.id}`);

      if (connectionError) throw connectionError;

      const friendIds = Array.from(
        new Set(
          (connectionRows ?? []).map((row) =>
            row.user_low_id === nextSession.user.id ? row.user_high_id : row.user_low_id,
          ),
        ),
      );

      let friendRows: FriendProfile[] = [];
      if (friendIds.length > 0) {
        const { data: profileRows, error: friendProfileError } = await supabase
          .from("profiles")
          .select("id,username,last_seen,avatar_url,bio")
          .in("id", friendIds);

        if (friendProfileError) throw friendProfileError;
        friendRows = (profileRows as FriendProfile[] | null) ?? [];
      }

      const { data: threadRowsRaw, error: threadError } = await supabase
        .from("message_threads")
        .select("id,user_low_id,user_high_id,last_message_at,created_at,updated_at")
        .or(`user_low_id.eq.${nextSession.user.id},user_high_id.eq.${nextSession.user.id}`);

      if (threadError) throw threadError;

      const threadRows = (threadRowsRaw as MessageThreadRow[] | null) ?? [];

      let messageRows: MessageRow[] = [];
      if (threadRows.length > 0) {
        const { data: messageRowsRaw, error: messageError } = await supabase
          .from("messages")
          .select("id,thread_id,sender_id,body,created_at")
          .in("thread_id", threadRows.map((thread) => thread.id))
          .order("created_at", { ascending: false });

        if (messageError) throw messageError;
        messageRows = (messageRowsRaw as MessageRow[] | null) ?? [];
      }

      const latestMessageByThread = new Map<string, MessageRow>();
      for (const row of messageRows) {
        if (!latestMessageByThread.has(row.thread_id)) {
          latestMessageByThread.set(row.thread_id, row);
        }
      }

      const friendById = new Map(friendRows.map((friend) => [friend.id, friend]));
      const nextThreads: ThreadSummary[] = [];

      for (const thread of threadRows) {
        const otherId = getOtherParticipant(thread, nextSession.user.id);
        const friend = friendById.get(otherId);
        if (!friend) continue;

        const latest = latestMessageByThread.get(thread.id);
        nextThreads.push({
          id: thread.id,
          friend,
          preview: latest?.body ? formatThreadPreview(latest.body) : "No messages yet.",
          lastMessageAt: latest?.created_at ?? thread.last_message_at ?? thread.updated_at ?? thread.created_at,
        });
      }

      nextThreads.sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      });

      friendRows.sort((a, b) => {
        const aName = a.username?.toLowerCase() ?? "";
        const bName = b.username?.toLowerCase() ?? "";
        return aName.localeCompare(bName);
      });

      setFriends(friendRows);
      setThreads(nextThreads);

      const threadId =
        nextActiveThreadId && nextThreads.some((thread) => thread.id === nextActiveThreadId)
          ? nextActiveThreadId
          : activeThreadId && nextThreads.some((thread) => thread.id === activeThreadId)
            ? activeThreadId
            : null;

      setActiveThreadId(threadId);
      if (threadId) {
        await loadConversation(threadId);
      } else {
        setConversation([]);
      }

      await loadForumData();
    } catch (error) {
      console.warn("Could not load social data:", error);
      setNotice(error instanceof Error ? error.message : "Could not load social data.");
    } finally {
      setLoading(false);
    }
  }, [activeThreadId, loadConversation, loadForumData]);

  const searchMembers = useCallback(async (query: string) => {
    const term = query.trim();

    if (!term || !session) {
      setMemberResults([]);
      setMemberSearching(false);
      return;
    }

    setMemberSearching(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id,username,last_seen,avatar_url,bio")
        .or(`username.ilike.%${term}%,bio.ilike.%${term}%`)
        .neq("id", session.user.id)
        .order("username", { ascending: true })
        .limit(20);

      if (error) throw error;
      setMemberResults((data as FriendProfile[] | null) ?? []);
    } catch (error) {
      console.warn("Could not search members:", error);
      setMemberResults([]);
    } finally {
      setMemberSearching(false);
    }
  }, [session]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleOpenMessages = () => {
      setOpen(true);
      setActiveTab("messages");
      void loadSocialData();
    };

    const handleOpenPanel = () => {
      setOpen(true);
      void loadSocialData();
    };

    const handleRefresh = () => {
      void loadSocialData(activeThreadId);
    };

    window.addEventListener("open-social-messages", handleOpenMessages as EventListener);
    window.addEventListener("open-social-panel", handleOpenPanel as EventListener);
    window.addEventListener("profile-updated", handleRefresh);
    window.addEventListener("friend-updated", handleRefresh);
    window.addEventListener("message-updated", handleRefresh);

    return () => {
      window.removeEventListener("open-social-messages", handleOpenMessages as EventListener);
      window.removeEventListener("open-social-panel", handleOpenPanel as EventListener);
      window.removeEventListener("profile-updated", handleRefresh);
      window.removeEventListener("friend-updated", handleRefresh);
      window.removeEventListener("message-updated", handleRefresh);
    };
  }, [activeThreadId, loadSocialData]);

  useEffect(() => {
    void loadSocialData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setFriends([]);
        setThreads([]);
        setConversation([]);
        setActiveThreadId(null);
        setMemberResults([]);
        setForumThreads([]);
        setForumPosts([]);
        setForumProfiles([]);
        setForumActiveThreadId(null);
        return;
      }

      void loadSocialData();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadSocialData]);

  useEffect(() => {
    if (!session?.user) return;

    const channel = supabase
      .channel(`social-messages:${session.user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const newMessage = payload.new as MessageRow;

          setConversation((current) => {
            if (newMessage.thread_id !== activeThreadId) return current;
            if (current.some((message) => message.id === newMessage.id)) return current;
            return [...current, newMessage];
          });

          setThreads((current) => {
            if (!current.some((thread) => thread.id === newMessage.thread_id)) {
              return current;
            }

            const updated = current.map((thread) =>
              thread.id === newMessage.thread_id
                ? {
                    ...thread,
                    preview: formatThreadPreview(newMessage.body),
                    lastMessageAt: newMessage.created_at,
                  }
                : thread,
            );

            updated.sort((a, b) => {
              const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
              const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
              return bTime - aTime;
            });

            return updated;
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeThreadId, session?.user?.id]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void searchMembers(memberSearch);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [memberSearch, searchMembers]);

  const displayName =
    session?.user.user_metadata?.username?.trim() || session?.user.email?.trim() || "Player";

  const username = profile?.username?.trim().toLowerCase() ?? "";
  const profileLink = username ? `/profile/${username}` : null;

  const activeThread = activeThreadId
    ? threads.find((thread) => thread.id === activeThreadId) ?? null
    : null;

  const forumProfileById = useMemo(
    () => new Map(forumProfiles.map((member) => [member.id, member])),
    [forumProfiles],
  );

  const forumActiveThread = useMemo(
    () => forumThreads.find((thread) => thread.id === forumActiveThreadId) ?? null,
    [forumActiveThreadId, forumThreads],
  );

  const forumActivePosts = useMemo(
    () => forumPosts.filter((post) => post.thread_id === forumActiveThreadId),
    [forumActiveThreadId, forumPosts],
  );

  const visibleForumThreads = useMemo(() => {
    const query = forumSearch.trim().toLowerCase();
    if (!query) return forumThreads;

    return forumThreads.filter((thread) => {
      const author = forumProfileById.get(thread.author_id);
      const title = thread.title.toLowerCase();
      const authorName = author?.username?.toLowerCase() ?? "";
      const preview = forumActiveThreadId === thread.id
        ? forumActivePosts.map((post) => post.body).join(" ").toLowerCase()
        : "";
      return (
        title.includes(query) ||
        authorName.includes(query) ||
        preview.includes(query)
      );
    });
  }, [forumActivePosts, forumActiveThreadId, forumProfileById, forumSearch, forumThreads]);

  const filteredFriends = useMemo(() => {
    const query = friendFilter.trim().toLowerCase();
    if (!query) return friends;

    return friends.filter((friend) => {
      const username = friend.username?.toLowerCase() ?? "";
      const bio = friend.bio?.toLowerCase() ?? "";
      return username.includes(query) || bio.includes(query);
    });
  }, [friendFilter, friends]);

  const stats = useMemo(
    () => [
      { label: "Messages", value: String(threads.length) },
      { label: "Friends", value: String(friends.length) },
      { label: "Clubs", value: "4" },
      { label: "Forum posts", value: "17" },
    ],
    [friends.length, threads.length],
  );

  const openThread = async (threadId: string) => {
    setActiveTab("messages");
    setActiveThreadId(threadId);
    await loadConversation(threadId);
  };

  const ensureThreadWithFriend = async (friendId: string) => {
    if (!session?.user) return null;

    const existing = threads.find((thread) => thread.friend.id === friendId);
    if (existing) {
      return existing.id;
    }

    const [userLowId, userHighId] = sortPair(session.user.id, friendId);

    const { data, error } = await supabase
      .from("message_threads")
      .insert({ user_low_id: userLowId, user_high_id: userHighId })
      .select("id")
      .single();

    if (error) throw error;

    return data.id as string;
  };

  const startChat = async (friendId: string) => {
    if (!session?.user) return;

    setNotice("");
    try {
      const threadId = await ensureThreadWithFriend(friendId);
      if (!threadId) {
        setNotice("Could not open that conversation.");
        return;
      }

      setOpen(true);
      setActiveTab("messages");
      setActiveThreadId(threadId);
      await loadConversation(threadId);
      await loadSocialData(threadId);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not open chat.");
    }
  };

  const openForumThread = async (threadId: string) => {
    setActiveTab("forum");
    setForumActiveThreadId(threadId);
    await loadForumData(threadId);
  };

  const createForumThread = async () => {
    if (!session?.user) return;

    const title = forumThreadTitle.trim();
    const body = forumThreadBody.trim();

    if (!title) {
      setNotice("Thread title cannot be empty.");
      return;
    }

    if (!body) {
      setNotice("Thread body cannot be empty.");
      return;
    }

    setForumPosting(true);
    setNotice("");

    try {
      const { data: threadData, error: threadError } = await supabase
        .from("forum_threads")
        .insert({
          author_id: session.user.id,
          title,
        })
        .select("id")
        .single();

      if (threadError) throw threadError;

      const threadId = threadData.id as string;

      const { error: postError } = await supabase.from("forum_posts").insert({
        thread_id: threadId,
        author_id: session.user.id,
        body,
      });

      if (postError) throw postError;

      setForumThreadTitle("");
      setForumThreadBody("");
      setForumComposerOpen(false);
      setForumActiveThreadId(threadId);
      await loadForumData(threadId);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not create thread.");
    } finally {
      setForumPosting(false);
    }
  };

  const replyForumThread = async () => {
    if (!session?.user || !forumActiveThreadId) return;

    const body = forumReplyBody.trim();
    if (!body) return;

    setForumPosting(true);
    setNotice("");

    try {
      const { error } = await supabase.from("forum_posts").insert({
        thread_id: forumActiveThreadId,
        author_id: session.user.id,
        body,
      });

      if (error) throw error;

      setForumReplyBody("");
      await loadForumData(forumActiveThreadId);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not post reply.");
    } finally {
      setForumPosting(false);
    }
  };

  const sendMessage = async () => {
    if (!session?.user || !activeThreadId) return;

    const body = messageBody.trim();
    if (!body) return;

    setSending(true);
    setNotice("");

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert({
          thread_id: activeThreadId,
          sender_id: session.user.id,
          body,
        })
        .select("id,thread_id,sender_id,body,created_at")
        .single();

      if (error) throw error;

      setMessageBody("");

      if (data) {
        const inserted = data as MessageRow;

        setConversation((current) => {
          if (current.some((message) => message.id === inserted.id)) return current;
          return [...current, inserted];
        });

        setThreads((current) => {
          const updated = current.map((thread) =>
            thread.id === activeThreadId
              ? {
                  ...thread,
                  preview: formatThreadPreview(inserted.body),
                  lastMessageAt: inserted.created_at,
                }
              : thread,
          );

          updated.sort((a, b) => {
            const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            return bTime - aTime;
          });

          return updated;
        });
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not send message.");
    } finally {
      setSending(false);
    }
  };

  const openMemberProfile = (member: FriendProfile) => {
    if (!member.username) return;
    router.push(`/profile/${member.username.toLowerCase()}`);
    setOpen(false);
  };

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
                    Sign in to view your profile, messages, friends, members, clubs, and forum.
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
                          onClick={() => {
                            setActiveTab(tab.key);
                            if (tab.key === "messages" && !activeThreadId && threads[0]) {
                              void openThread(threads[0].id);
                            }
                            if (tab.key === "forum") {
                              void loadForumData();
                            }
                          }}
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
                        <div className="mt-3 flex items-start gap-3">
                          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-lg font-semibold text-slate-100">
                            {profile?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={profile.avatar_url}
                                alt="Your avatar"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              getInitials(displayName)
                            )}
                          </div>
                          <div>
                            <div className="mt-1 text-xl font-semibold text-slate-100">
                              {displayName}
                            </div>
                            <div className="text-sm text-slate-500">
                              {session.user.email}
                            </div>
                          </div>
                        </div>
                        {profile?.bio ? (
                          <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                            {profile.bio}
                          </p>
                        ) : null}
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
                      <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-3 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                          <MessageSquareMore className="h-4 w-4" />
                          {activeThread ? "Conversation" : "Inbox"}
                        </div>

                        {activeThread ? (
                          <button
                            type="button"
                            onClick={() => {
                              setActiveThreadId(null);
                              setConversation([]);
                            }}
                            className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 transition hover:bg-slate-800"
                          >
                            Back
                          </button>
                        ) : null}
                      </div>

                      {loading ? (
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                          Loading messages...
                        </div>
                      ) : activeThread ? (
                        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-sm font-semibold text-slate-100">
                              {activeThread.friend.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={activeThread.friend.avatar_url}
                                  alt={activeThread.friend.username ?? "Friend avatar"}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                getInitials(activeThread.friend.username)
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-slate-100">
                                {activeThread.friend.username ?? "Player"}
                              </div>
                              <div className="text-xs text-slate-500">
                                {activeThread.lastMessageAt ? formatDate(activeThread.lastMessageAt) : "No messages yet"}
                              </div>
                            </div>
                          </div>

                          <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                            {conversationLoading ? (
                              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-400">
                                Loading conversation...
                              </div>
                            ) : conversation.length === 0 ? (
                              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-400">
                                Say hello to start the conversation.
                              </div>
                            ) : (
                              conversation.map((message) => {
                                const mine = message.sender_id === session.user.id;
                                return (
                                  <div
                                    key={message.id}
                                    className={`flex ${mine ? "justify-end" : "justify-start"}`}
                                  >
                                    <div
                                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                                        mine
                                          ? "bg-slate-100 text-slate-950"
                                          : "border border-slate-800 bg-slate-900 text-slate-100"
                                      }`}
                                    >
                                      {message.body}
                                      <div className={`mt-2 text-[11px] ${mine ? "text-slate-600" : "text-slate-500"}`}>
                                        {formatDate(message.created_at)}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          <div className="space-y-2 border-t border-slate-800 pt-3">
                            <textarea
                              value={messageBody}
                              onChange={(e) => setMessageBody(e.target.value)}
                              rows={3}
                              placeholder="Write a message..."
                              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
                            />

                            <button
                              type="button"
                              onClick={() => void sendMessage()}
                              disabled={sending || !messageBody.trim()}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Send className="h-4 w-4" />
                              {sending ? "Sending..." : "Send message"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {threads.length === 0 ? (
                            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                              No conversations yet. Open a friend’s profile and start a chat.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {threads.map((thread) => (
                                <button
                                  key={thread.id}
                                  type="button"
                                  onClick={() => void openThread(thread.id)}
                                  className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left transition hover:bg-slate-800/70"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-sm font-semibold text-slate-100">
                                        {thread.friend.avatar_url ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img
                                            src={thread.friend.avatar_url}
                                            alt={thread.friend.username ?? "Friend avatar"}
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          getInitials(thread.friend.username)
                                        )}
                                      </div>
                                      <div>
                                        <div className="font-medium text-slate-100">
                                          {thread.friend.username ?? "Player"}
                                        </div>
                                        <div className="mt-1 max-w-[230px] text-sm text-slate-500">
                                          {thread.preview}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="text-right text-xs text-slate-500">
                                      {thread.lastMessageAt ? formatDate(thread.lastMessageAt) : ""}
                                    </div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                            <div className="mb-2 text-xs uppercase tracking-wide text-slate-500">
                              Quick start
                            </div>
                            {friends.length === 0 ? (
                              <div className="text-sm text-slate-400">
                                Add a few friends first, then start a conversation from their profile.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {friends.slice(0, 3).map((friend) => (
                                  <div
                                    key={friend.id}
                                    className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 px-3 py-2"
                                  >
                                    <div>
                                      <div className="text-sm font-medium text-slate-100">
                                        {friend.username ?? "Player"}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        {friend.bio?.trim() || "Ready to chat"}
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => void startChat(friend.id)}
                                      className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-medium text-slate-100 transition hover:bg-slate-800"
                                    >
                                      Chat
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  ) : null}

                  {activeTab === "friends" ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                        <input
                          type="text"
                          value={friendFilter}
                          onChange={(e) => setFriendFilter(e.target.value)}
                          placeholder="Search friends"
                          className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                        />
                      </div>

                      {filteredFriends.length === 0 ? (
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                          {friends.length === 0
                            ? "No friends yet. Accept a request from a profile to start building your list."
                            : "No friends match that search. "}
                        </div>
                      ) : (
                        filteredFriends.map((friend) => (
                          <div
                            key={friend.id}
                            className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-sm font-semibold text-slate-100">
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
                              <div className="flex flex-col gap-2">
                                <button
                                  type="button"
                                  onClick={() => void startChat(friend.id)}
                                  className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-white"
                                >
                                  Chat
                                </button>
                                {friend.username ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      router.push(`/profile/${friend.username?.toLowerCase()}`);
                                      setOpen(false);
                                    }}
                                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 transition hover:bg-slate-800"
                                  >
                                    View
                                  </button>
                                ) : null}
                              </div>
                            </div>
                            {friend.bio?.trim() ? (
                              <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                                {friend.bio}
                              </p>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  ) : null}

                  {activeTab === "members" ? (
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                        <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                          <Search className="h-4 w-4" />
                          Member directory
                        </div>
                        <p className="mt-2 text-sm leading-6 text-slate-400">
                          Search usernames and bios to find people on the site.
                        </p>
                      </div>

                      {memberSearch.trim() ? (
                        <div className="space-y-2">
                          {memberSearching ? (
                            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                              Searching members...
                            </div>
                          ) : memberResults.length === 0 ? (
                            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                              No members matched that search.
                            </div>
                          ) : (
                            memberResults.map((member) => (
                              <div
                                key={member.id}
                                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-sm font-semibold text-slate-100">
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
                                    <div className="min-w-0">
                                      <div className="truncate font-medium text-slate-100">
                                        {member.username ?? "Player"}
                                      </div>
                                      <div className="text-sm text-slate-500">
                                        {member.last_seen ? `Last seen ${formatDate(member.last_seen)}` : "Member"}
                                      </div>
                                    </div>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => openMemberProfile(member)}
                                    disabled={!member.username}
                                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                                  >
                                    View profile
                                  </button>
                                </div>

                                {member.bio?.trim() ? (
                                  <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">
                                    {member.bio}
                                  </p>
                                ) : null}
                              </div>
                            ))
                          )}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                          Start typing above to find members.
                        </div>
                      )}
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
                      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                              <Bell className="h-4 w-4" />
                              Public forum
                            </div>
                            <h3 className="mt-2 text-lg font-semibold text-slate-100">
                              Chess Forum
                            </h3>
                            <p className="mt-2 text-sm leading-6 text-slate-400">
                              One public board for discussions, openings, tactics, endgames, and site chat.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => {
                              setForumComposerOpen((current) => !current);
                              setForumActiveThreadId(null);
                            }}
                            className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-white"
                          >
                            {forumComposerOpen ? "Close" : "New thread"}
                          </button>
                        </div>

                        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 px-3 py-2">
                          <input
                            type="text"
                            value={forumSearch}
                            onChange={(e) => setForumSearch(e.target.value)}
                            placeholder="Search forum threads"
                            className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500"
                          />
                        </div>
                      </div>

                      {forumComposerOpen ? (
                        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                          <div className="text-xs uppercase tracking-wide text-slate-500">
                            Start a thread
                          </div>

                          <input
                            type="text"
                            value={forumThreadTitle}
                            onChange={(e) => setForumThreadTitle(e.target.value)}
                            placeholder="Thread title"
                            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
                          />

                          <textarea
                            value={forumThreadBody}
                            onChange={(e) => setForumThreadBody(e.target.value)}
                            rows={4}
                            placeholder="Write the first post..."
                            className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
                          />

                          <button
                            type="button"
                            onClick={() => void createForumThread()}
                            disabled={forumPosting || !forumThreadTitle.trim() || !forumThreadBody.trim()}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            <Send className="h-4 w-4" />
                            {forumPosting ? "Posting..." : "Publish thread"}
                          </button>
                        </div>
                      ) : null}

                      {forumLoading ? (
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                          Loading forum...
                        </div>
                      ) : forumThreads.length === 0 ? (
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                          No forum threads yet. Start the first discussion.
                        </div>
                      ) : forumActiveThread ? (
                        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                          <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                                {forumActiveThread.is_pinned ? (
                                  <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-300">
                                    Pinned
                                  </span>
                                ) : null}
                                <span>Thread</span>
                              </div>
                              <h3 className="mt-2 text-lg font-semibold text-slate-100">
                                {forumActiveThread.title}
                              </h3>
                              <div className="mt-1 text-xs text-slate-500">
                                {forumActiveThread.reply_count != null
                                  ? `${Math.max(forumActiveThread.reply_count - 1, 0)} replies`
                                  : "Public discussion"}
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => setForumActiveThreadId(null)}
                              className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100 transition hover:bg-slate-800"
                            >
                              Back
                            </button>
                          </div>

                          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
                            {forumActivePosts.length === 0 ? (
                              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-3 text-sm text-slate-400">
                                Loading posts...
                              </div>
                            ) : (
                              forumActivePosts.map((post, index) => {
                                const author = forumProfileById.get(post.author_id);
                                const isFirst = index === 0;
                                return (
                                  <div
                                    key={post.id}
                                    className={`rounded-2xl border p-4 ${
                                      isFirst
                                        ? "border-slate-700 bg-slate-900/80"
                                        : "border-slate-800 bg-slate-900/60"
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-center gap-3 min-w-0">
                                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 text-sm font-semibold text-slate-100">
                                          {author?.avatar_url ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                              src={author.avatar_url}
                                              alt={author.username ?? "Author avatar"}
                                              className="h-full w-full object-cover"
                                            />
                                          ) : (
                                            getInitials(author?.username)
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <div className="truncate font-medium text-slate-100">
                                            {author?.username ?? "Player"}
                                          </div>
                                          <div className="text-xs text-slate-500">
                                            {formatDate(post.created_at)}
                                          </div>
                                        </div>
                                      </div>
                                      {isFirst ? (
                                        <div className="rounded-full border border-slate-700 bg-slate-950 px-2 py-1 text-[11px] uppercase tracking-wide text-slate-400">
                                          OP
                                        </div>
                                      ) : null}
                                    </div>

                                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                                      {post.body}
                                    </p>
                                  </div>
                                );
                              })
                            )}
                          </div>

                          <div className="space-y-2 border-t border-slate-800 pt-3">
                            <textarea
                              value={forumReplyBody}
                              onChange={(e) => setForumReplyBody(e.target.value)}
                              rows={3}
                              placeholder="Write a reply..."
                              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
                            />

                            <button
                              type="button"
                              onClick={() => void replyForumThread()}
                              disabled={forumPosting || !forumReplyBody.trim()}
                              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              <Send className="h-4 w-4" />
                              {forumPosting ? "Posting..." : "Post reply"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {visibleForumThreads.map((thread) => {
                            const author = forumProfileById.get(thread.author_id);
                            return (
                              <button
                                key={thread.id}
                                type="button"
                                onClick={() => void openForumThread(thread.id)}
                                className="w-full rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-left transition hover:bg-slate-800/70"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide text-slate-500">
                                      {thread.is_pinned ? (
                                        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-amber-300">
                                          Pinned
                                        </span>
                                      ) : null}
                                      <span>Forum thread</span>
                                    </div>
                                    <div className="mt-2 font-medium text-slate-100">
                                      {thread.title}
                                    </div>
                                    <div className="mt-1 text-sm text-slate-500">
                                      by {author?.username ?? "Player"}
                                    </div>
                                  </div>

                                  <div className="text-right text-xs text-slate-500">
                                    <div>
                                      {thread.reply_count != null
                                        ? `${Math.max(thread.reply_count - 1, 0)} replies`
                                        : "0 replies"}
                                    </div>
                                    <div className="mt-1">
                                      {thread.last_post_at ? formatDate(thread.last_post_at) : formatDate(thread.created_at)}
                                    </div>
                                  </div>
                                </div>
                              </button>
                            );
                          })}

                          {visibleForumThreads.length === 0 ? (
                            <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                              No threads match your search.
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ) : null}

                  {notice ? (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                      {notice}
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
          onClick={() => {
            setOpen(true);
            void loadSocialData();
          }}
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
