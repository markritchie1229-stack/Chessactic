"use server";

import { isAdmin } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "../clubs/_lib/supabase-server";

type ForumThreadRow = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string | null;
  last_post_at: string | null;
  reply_count: number;
};

type ForumPostRow = {
  id: string;
  thread_id: string;
  author_id: string;
  body: string;
  image_url: string | null;
  created_at: string;
  updated_at: string | null;
};

async function requireForumAdmin() {
  const { supabase, userId } = await getAuthedContext();

  if (!isAdmin(userId)) {
    throw new Error("Only the site admin can do that.");
  }

  return { supabase, userId };
}

async function getThreadAndFirstPost(threadId: string) {
  const { supabase } = await getAuthedContext();

  const { data: thread, error: threadError } = await supabase
    .from("forum_threads")
    .select("id,title,created_at,updated_at,last_post_at,reply_count")
    .eq("id", threadId)
    .maybeSingle();

  if (threadError) throw new Error(threadError.message);
  if (!thread) throw new Error("Thread not found.");

  const { data: firstPost, error: postError } = await supabase
    .from("forum_posts")
    .select("id,thread_id,author_id,body,image_url,created_at,updated_at")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (postError) throw new Error(postError.message);
  if (!firstPost) throw new Error("Thread post not found.");

  return {
    supabase,
    thread: thread as ForumThreadRow,
    firstPost: firstPost as ForumPostRow,
  };
}

export async function editForumThread(input: {
  threadId: string;
  title: string;
}) {
  const { supabase, userId } = await requireForumAdmin();

  const title = input.title.trim();
  if (!title) {
    throw new Error("Thread title cannot be empty.");
  }

  const { error } = await supabase
    .from("forum_threads")
    .update({
      title,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.threadId);

  if (error) throw new Error(error.message);

  revalidatePath("/social/forum");
  return { status: "updated" as const };
}

export async function deleteForumThread(threadId: string) {
  const { supabase, userId } = await requireForumAdmin();

  const { data: thread, error: threadError } = await supabase
    .from("forum_threads")
    .select("id")
    .eq("id", threadId)
    .maybeSingle();

  if (threadError) throw new Error(threadError.message);
  if (!thread) throw new Error("Thread not found.");

  const { error: postsError } = await supabase
    .from("forum_posts")
    .delete()
    .eq("thread_id", threadId);

  if (postsError) throw new Error(postsError.message);

  const { error } = await supabase
    .from("forum_threads")
    .delete()
    .eq("id", threadId);

  if (error) throw new Error(error.message);

  revalidatePath("/social/forum");
  return { status: "deleted" as const };
}

export async function editForumPost(input: {
  postId: string;
  body: string;
  imageUrl?: string | null;
}) {
  const { supabase, userId } = await requireForumAdmin();

  const body = input.body.trim();
  const imageUrl = input.imageUrl?.trim() || null;

  if (!body && !imageUrl) {
    throw new Error("Post body or image is required.");
  }

  const { data: post, error: postLookupError } = await supabase
    .from("forum_posts")
    .select("id,thread_id")
    .eq("id", input.postId)
    .maybeSingle();

  if (postLookupError) throw new Error(postLookupError.message);
  if (!post) throw new Error("Post not found.");

  const { error } = await supabase
    .from("forum_posts")
    .update({
      body,
      image_url: imageUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.postId);

  if (error) throw new Error(error.message);

  revalidatePath("/social/forum");
  return { status: "updated" as const };
}

export async function deleteForumPost(postId: string) {
  const { supabase, userId } = await requireForumAdmin();

  const { data: post, error: postLookupError } = await supabase
    .from("forum_posts")
    .select("id,thread_id")
    .eq("id", postId)
    .maybeSingle();

  if (postLookupError) throw new Error(postLookupError.message);
  if (!post) throw new Error("Post not found.");

  const { data: firstPost, error: firstPostError } = await supabase
    .from("forum_posts")
    .select("id")
    .eq("thread_id", post.thread_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstPostError) throw new Error(firstPostError.message);

  if (firstPost?.id === postId) {
    return deleteForumThread(post.thread_id);
  }

  const { error } = await supabase
    .from("forum_posts")
    .delete()
    .eq("id", postId);

  if (error) throw new Error(error.message);

  const { count } = await supabase
    .from("forum_posts")
    .select("id", { count: "exact", head: true })
    .eq("thread_id", post.thread_id);

  const { data: latestPost } = await supabase
    .from("forum_posts")
    .select("created_at")
    .eq("thread_id", post.thread_id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase
    .from("forum_threads")
    .update({
      reply_count: Math.max((count ?? 0) - 1, 0),
      last_post_at: latestPost?.created_at ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", post.thread_id);

  revalidatePath("/social/forum");
  return { status: "deleted" as const };
}

type ProfileModerationState = {
  muted_indefinitely: boolean | null;
  muted_until: string | null;
  account_status: string | null;
};

type AuthedContext = {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  userId: string;
};

type MessageThreadRow = {
  id: string;
  user_low_id: string;
  user_high_id: string;
  last_message_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

function normalizeText(value: string | null | undefined) {
  return value?.trim() ?? "";
}

async function getAuthedContext(): Promise<AuthedContext> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message);
  }

  if (!user) {
    throw new Error("You must be signed in to do that.");
  }

  return { supabase, userId: user.id };
}

async function assertPostingAllowed(supabase: AuthedContext["supabase"], userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("muted_indefinitely,muted_until,account_status")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const profile = data as ProfileModerationState | null;
  if (!profile) return;

  if (profile.account_status === "closed") {
    throw new Error("This account is closed.");
  }

  if (profile.muted_indefinitely) {
    throw new Error("You are muted.");
  }

  if (profile.muted_until) {
    const until = new Date(profile.muted_until);
    if (!Number.isNaN(until.getTime()) && until > new Date()) {
      throw new Error("You are muted.");
    }
  }
}

async function assertDirectMessageAllowed(supabase: AuthedContext["supabase"], userId: string) {
  await assertPostingAllowed(supabase, userId);
}

async function getMessageThreadForUser(
  supabase: AuthedContext["supabase"],
  threadId: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("message_threads")
    .select("id,user_low_id,user_high_id,last_message_at,created_at,updated_at")
    .eq("id", threadId)
    .maybeSingle();

  if (error) throw new Error(error.message);

  const thread = data as MessageThreadRow | null;
  if (!thread) {
    throw new Error("Conversation not found.");
  }

  const isParticipant =
    thread.user_low_id === userId || thread.user_high_id === userId;

  if (!isParticipant) {
    throw new Error("You do not have access to this conversation.");
  }

  return thread;
}

export async function sendDirectMessage(input: {
  threadId: string;
  body: string;
}) {
  const { supabase, userId } = await getAuthedContext();
  await assertDirectMessageAllowed(supabase, userId);

  const threadId = input.threadId.trim();
  const body = input.body.trim();

  if (!threadId) {
    throw new Error("Missing conversation.");
  }

  if (!body) {
    throw new Error("Message cannot be empty.");
  }

  await getMessageThreadForUser(supabase, threadId, userId);

  const { error } = await supabase.from("messages").insert({
    thread_id: threadId,
    sender_id: userId,
    body,
  });

  if (error) {
    throw new Error(error.message);
  }

  const nowIso = new Date().toISOString();

  await supabase
    .from("message_threads")
    .update({
      last_message_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", threadId);

  revalidatePath("/social/messages");
  return { status: "sent" as const };
}

export async function createForumThread(input: {
  title: string;
  body: string;
  imageUrl?: string | null;
}) {
  const { supabase, userId } = await getAuthedContext();
  await assertPostingAllowed(supabase, userId);

  const title = normalizeText(input.title);
  const body = normalizeText(input.body);
  const imageUrl = normalizeText(input.imageUrl ?? null) || null;

  if (!title) {
    throw new Error("Thread title cannot be empty.");
  }

  if (!body && !imageUrl) {
    throw new Error("Thread body or image is required.");
  }

  const { data: thread, error: threadError } = await supabase
    .from("forum_threads")
    .insert({
      author_id: userId,
      title,
    })
    .select("id")
    .single();

  if (threadError) {
    throw new Error(threadError.message);
  }

  if (!thread) {
    throw new Error("Could not create thread.");
  }

  const { error: postError } = await supabase.from("forum_posts").insert({
    thread_id: thread.id,
    author_id: userId,
    body,
    image_url: imageUrl,
  });

  if (postError) {
    throw new Error(postError.message);
  }

  revalidatePath("/social/forum");
  return { status: "created" as const, threadId: thread.id as string };
}

export async function replyToForumThread(input: {
  threadId: string;
  body: string;
  imageUrl?: string | null;
}) {
  const { supabase, userId } = await getAuthedContext();
  await assertPostingAllowed(supabase, userId);

  const threadId = input.threadId.trim();
  const body = normalizeText(input.body);
  const imageUrl = normalizeText(input.imageUrl ?? null) || null;

  if (!threadId) {
    throw new Error("Missing thread.");
  }

  if (!body && !imageUrl) {
    throw new Error("Reply body or image is required.");
  }

  const { data: thread, error: threadError } = await supabase
    .from("forum_threads")
    .select("id,reply_count")
    .eq("id", threadId)
    .maybeSingle();

  if (threadError) {
    throw new Error(threadError.message);
  }

  if (!thread) {
    throw new Error("Thread not found.");
  }

  const { error: postError } = await supabase.from("forum_posts").insert({
    thread_id: threadId,
    author_id: userId,
    body,
    image_url: imageUrl,
  });

  if (postError) {
    throw new Error(postError.message);
  }

  const replyCount = typeof thread.reply_count === "number" ? thread.reply_count : 0;

  await supabase
    .from("forum_threads")
    .update({
      reply_count: replyCount + 1,
      last_post_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", threadId);

  revalidatePath("/social/forum");
  return { status: "replied" as const };
}