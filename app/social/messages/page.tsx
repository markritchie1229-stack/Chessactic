"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { SocialPageShell } from "../_components/SocialPageShell";

type MessageThreadRow = {
  id: string;
  user_low_id: string;
  user_high_id: string;
  last_message_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  last_seen: string | null;
};

type MessageRow = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type ThreadSummary = {
  id: string;
  friend: ProfileRow;
  preview: string;
  lastMessageAt: string | null;
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

function formatThreadPreview(text: string) {
  const cleaned = text.trim();
  if (cleaned.length <= 72) return cleaned;
  return `${cleaned.slice(0, 72).trimEnd()}…`;
}

function getOtherParticipant(thread: MessageThreadRow, userId: string) {
  return thread.user_low_id === userId ? thread.user_high_id : thread.user_low_id;
}

export default function SocialMessagesPage() {
  const [loading, setLoading] = useState(true);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [conversation, setConversation] = useState<MessageRow[]>([]);
  const [messageBody, setMessageBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);

  const loadConversation = useCallback(async (threadId: string) => {
    const { data, error } = await supabase
      .from("messages")
      .select("id,thread_id,sender_id,body,created_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    setConversation((data as MessageRow[] | null) ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    const { data } = await supabase.auth.getSession();
    const session = data.session;

    if (!session) {
      setThreads([]);
      setConversation([]);
      setSessionUserId(null);
      setLoading(false);
      return;
    }

    setSessionUserId(session.user.id);

    const { data: threadRowsRaw, error: threadError } = await supabase
      .from("message_threads")
      .select("id,user_low_id,user_high_id,last_message_at,created_at,updated_at")
      .or(`user_low_id.eq.${session.user.id},user_high_id.eq.${session.user.id}`);

    if (threadError) throw threadError;

    const threadRows = (threadRowsRaw as MessageThreadRow[] | null) ?? [];

    const friendIds = Array.from(
      new Set(threadRows.map((thread) => getOtherParticipant(thread, session.user.id))),
    );

    let friendRows: ProfileRow[] = [];
    if (friendIds.length > 0) {
      const { data: profileRows, error: friendError } = await supabase
        .from("profiles")
        .select("id,username,avatar_url,bio,last_seen")
        .in("id", friendIds);

      if (friendError) throw friendError;
      friendRows = (profileRows as ProfileRow[] | null) ?? [];
    }

    const friendById = new Map(friendRows.map((friend) => [friend.id, friend]));
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

    const latestByThread = new Map<string, MessageRow>();
    for (const row of messageRows) {
      if (!latestByThread.has(row.thread_id)) latestByThread.set(row.thread_id, row);
    }

    const nextThreads: ThreadSummary[] = threadRows
      .map((thread) => {
        const friend = friendById.get(getOtherParticipant(thread, session.user.id));
        if (!friend) return null;

        const latest = latestByThread.get(thread.id);
        return {
          id: thread.id,
          friend,
          preview: latest?.body ? formatThreadPreview(latest.body) : "No messages yet.",
          lastMessageAt:
            latest?.created_at ?? thread.last_message_at ?? thread.updated_at ?? thread.created_at,
        };
      })
      .filter(Boolean) as ThreadSummary[];

    nextThreads.sort((a, b) => {
      const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
      const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
      return bTime - aTime;
    });

    setThreads(nextThreads);

    const firstThread = nextThreads[0] ?? null;
    setActiveThreadId(firstThread?.id ?? null);

    if (firstThread) {
      await loadConversation(firstThread.id);
    } else {
      setConversation([]);
    }

    setLoading(false);
  }, [loadConversation]);

  useEffect(() => {
    void load();
  }, [load]);

  const activeThread = activeThreadId ? threads.find((t) => t.id === activeThreadId) ?? null : null;

  const sendMessage = async () => {
    if (!sessionUserId || !activeThreadId) return;

    const body = messageBody.trim();
    if (!body) return;

    setSending(true);
    const { error, data } = await supabase
      .from("messages")
      .insert({ thread_id: activeThreadId, sender_id: sessionUserId, body })
      .select("id,thread_id,sender_id,body,created_at")
      .single();

    if (!error && data) {
      setMessageBody("");
      await loadConversation(activeThreadId);
      await load();
    }

    setSending(false);
  };

  return (
    <SocialPageShell title="Messages" subtitle="Your inbox and direct conversations.">
      {loading ? (
        <div className="text-sm text-slate-400">Loading messages...</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
          <div className="space-y-3">
            {threads.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-400">
                No conversations yet.
              </div>
            ) : (
              threads.map((thread) => (
                <button
                  key={thread.id}
                  type="button"
                  onClick={() => {
                    setActiveThreadId(thread.id);
                    void loadConversation(thread.id);
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    activeThreadId === thread.id
                      ? "border-slate-100 bg-slate-100 text-slate-950"
                      : "border-slate-800 bg-slate-950/60 text-slate-100 hover:bg-slate-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 text-sm font-semibold">
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
                    <div className="min-w-0">
                      <div className="truncate font-medium">{thread.friend.username ?? "Player"}</div>
                      <div className="truncate text-sm opacity-70">{thread.preview}</div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            {activeThread ? (
              <div className="space-y-3">
                <div className="border-b border-slate-800 pb-3">
                  <div className="font-medium">{activeThread.friend.username ?? "Player"}</div>
                  <div className="text-xs text-slate-500">
                    {activeThread.lastMessageAt ? formatDate(activeThread.lastMessageAt) : "No messages yet"}
                  </div>
                </div>

                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {conversation.map((message) => {
                    const mine = message.sender_id === sessionUserId;
                    return (
                      <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-6 ${
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
                  })}
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
                    className="rounded-2xl bg-slate-100 px-4 py-3 font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {sending ? "Sending..." : "Send"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">Select a conversation.</div>
            )}
          </div>
        </div>
      )}
    </SocialPageShell>
  );
}