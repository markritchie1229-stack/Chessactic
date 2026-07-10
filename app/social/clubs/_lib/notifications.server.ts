"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "./supabase-server";

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

export type SendSystemNotificationInput = {
  supabase: SupabaseClient;
  senderId: string;
  recipientId: string;
  title: string;
  body: string;
};

function formatSystemNotification(title: string, body: string) {
  const cleanTitle = title.trim();
  const cleanBody = body.trim();

  if (!cleanTitle) return cleanBody;
  if (!cleanBody) return cleanTitle;

  return `${cleanTitle}\n\n${cleanBody}`;
}

async function getOrCreateThread(
  supabase: SupabaseClient,
  senderId: string,
  recipientId: string,
) {
  const [userLowId, userHighId] =
    senderId < recipientId ? [senderId, recipientId] : [recipientId, senderId];

  const { data: existing, error: existingError } = await supabase
    .from("message_threads")
    .select("id")
    .eq("user_low_id", userLowId)
    .eq("user_high_id", userHighId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing?.id) {
    return existing.id as string;
  }

  const nowIso = new Date().toISOString();

  const { data: created, error: createError } = await supabase
    .from("message_threads")
    .insert({
      user_low_id: userLowId,
      user_high_id: userHighId,
      last_message_at: nowIso,
    })
    .select("id")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  if (!created?.id) {
    throw new Error("Could not create message thread.");
  }

  return created.id as string;
}

export async function sendSystemNotification({
  supabase,
  senderId,
  recipientId,
  title,
  body,
}: SendSystemNotificationInput) {
  const threadId = await getOrCreateThread(supabase, senderId, recipientId);
  const messageBody = formatSystemNotification(title, body);
  const nowIso = new Date().toISOString();

  const { error: messageError } = await supabase.from("messages").insert({
    thread_id: threadId,
    sender_id: senderId,
    body: messageBody,
  });

  if (messageError) {
    throw new Error(messageError.message);
  }

  const { error: threadError } = await supabase
    .from("message_threads")
    .update({
      last_message_at: nowIso,
      updated_at: nowIso,
    })
    .eq("id", threadId);

  if (threadError) {
    throw new Error(threadError.message);
  }

  revalidatePath("/social/messages");
}