import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "../../../_lib/supabase-server";
import { getClubBySlug, getCurrentMember, getProfiles } from "../../../_lib/server-queries";
import type { ClubPageParams } from "../../../_lib/types";

type PageProps = {
  params: ClubPageParams;
};

type AuditRow = {
  id: string;
  club_id: string;
  action: string;
  actor_id: string;
  target_user_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
};

type ThreadRow = {
  id: string;
  title: string;
  body: string;
};

type CommentRow = {
  id: string;
  body: string;
  thread_id: string | null;
};

function humanizeRank(rank: string | null | undefined) {
  if (!rank) return "member";
  return rank.replaceAll("_", " ");
}

function formatTime(value: string) {
  return new Date(value).toLocaleString();
}

function displayName(profile?: Profile | null, fallback?: string | null) {
  return profile?.username?.trim() || fallback || "Unknown user";
}

function actionSummary(input: {
  log: AuditRow;
  actorName: string;
  targetName: string | null;
  thread?: ThreadRow | null;
  comment?: CommentRow | null;
}) {
  const { log, actorName, targetName, thread, comment } = input;
  const details = log.details ?? {};

  switch (log.action) {
    case "club_created":
      return `${actorName} created the club.`;

    case "club_updated":
      return `${actorName} updated the club settings.`;

    case "club_disbanded":
      return `${actorName} disbanded the club.`;

    case "member_joined":
      return `${actorName} joined the club.`;

    case "member_left":
      return `${actorName} left the club.`;

    case "member_kicked":
      return `${actorName} removed ${targetName ?? "a member"} from the club.`;

    case "member_muted":
      return `${actorName} muted ${targetName ?? "a member"}.`;

    case "member_unmuted":
      return `${actorName} unmuted ${targetName ?? "a member"}.`;

    case "member_promoted":
      return `${actorName} promoted ${targetName ?? "a member"} to ${humanizeRank(
        typeof details.to_rank === "string" ? details.to_rank : null,
      )}.`;

    case "member_demoted":
      return `${actorName} demoted ${targetName ?? "a member"} to ${humanizeRank(
        typeof details.to_rank === "string" ? details.to_rank : null,
      )}.`;

    case "leadership_transferred":
      return `${actorName} transferred leadership to ${targetName ?? "a member"}.`;

    case "thread_created":
      return `${actorName} created a thread: "${thread?.title || (typeof details.title === "string" ? details.title : "Untitled thread")}".`;

    case "thread_deleted":
      return `${actorName} deleted a thread.`;

    case "comment_posted":
      return `${actorName} posted a comment${thread?.title ? ` in "${thread.title}"` : ""}.`;

    case "comment_deleted":
      return `${actorName} deleted a comment.`;

    case "invite_sent":
      return `${actorName} sent an invite to ${targetName ?? "a user"}.`;

    case "invite_accepted":
      return `${actorName} accepted an invite.`;

    case "invite_declined":
      return `${actorName} declined an invite.`;

    case "join_requested":
      return `${actorName} requested to join the club.`;

    case "join_request_approved":
      return `${actorName} approved ${targetName ?? "a member"}'s join request.`;

    case "join_request_declined":
      return `${actorName} declined ${targetName ?? "a member"}'s join request.`;

    default:
      return `${actorName} performed ${log.action.replaceAll("_", " ")}.`;
  }
}

export default async function ClubAuditPage({ params }: PageProps) {
  const { slug } = await params;

  const club = await getClubBySlug(slug);

  if (!club) {
    notFound();
  }

  const currentMember = await getCurrentMember(club.id);

  if (
    !currentMember ||
    !["leader", "co_leader", "senior_admin", "admin"].includes(currentMember.rank)
  ) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();

  const { data: logsData, error } = await supabase
    .from("club_audit_log")
    .select("*")
    .eq("club_id", club.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const logs = (logsData ?? []) as AuditRow[];

  const userIds = new Set<string>();
  const threadIds = new Set<string>();
  const commentIds = new Set<string>();

  for (const log of logs) {
    if (log.actor_id) {
      userIds.add(log.actor_id);
    }

    if (log.target_user_id) {
      userIds.add(log.target_user_id);
    }

    const details = log.details ?? {};

    if (typeof details.thread_id === "string") {
      threadIds.add(details.thread_id);
    }

    if (typeof details.comment_id === "string") {
      commentIds.add(details.comment_id);
    }
  }

  const profiles = await getProfiles([...userIds]);

  const { data: threadsData, error: threadsError } = threadIds.size
    ? await supabase
        .from("club_threads")
        .select("id, title, body")
        .in("id", [...threadIds])
    : { data: [], error: null };

  if (threadsError) {
    throw new Error(threadsError.message);
  }

  const { data: commentsData, error: commentsError } = commentIds.size
    ? await supabase
        .from("club_comments")
        .select("id, body, thread_id")
        .in("id", [...commentIds])
    : { data: [], error: null };

  if (commentsError) {
    throw new Error(commentsError.message);
  }

  const threads = new Map<string, ThreadRow>(
    (threadsData ?? []).map((thread) => [thread.id, thread as ThreadRow]),
  );

  const comments = new Map<string, CommentRow>(
    (commentsData ?? []).map((comment) => [comment.id, comment as CommentRow]),
  );

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Club Audit Log</h1>
          <p className="mt-2 text-sm text-slate-400">
            Human-readable history of important club actions.
          </p>
        </div>

        <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
          {logs.length} entries
        </span>
      </div>

      {!logs.length ? (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center text-slate-400">
          No audit entries yet.
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const actorProfile = profiles.get(log.actor_id) ?? null;
            const targetProfile = log.target_user_id
              ? (profiles.get(log.target_user_id) ?? null)
              : null;

            const actorName = displayName(actorProfile, log.actor_id);
            const targetName = log.target_user_id
              ? displayName(targetProfile, log.target_user_id)
              : null;

            const details = log.details ?? {};

            const threadId =
              typeof details.thread_id === "string" ? details.thread_id : null;
            const commentId =
              typeof details.comment_id === "string" ? details.comment_id : null;

            const thread = threadId ? threads.get(threadId) ?? null : null;
            const comment = commentId ? comments.get(commentId) ?? null : null;

            const summary = actionSummary({
              log,
              actorName,
              targetName,
              thread,
              comment,
            });

            return (
              <div
                key={log.id}
                className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
              >
                <div className="flex flex-wrap items-start gap-4">
                  {actorProfile?.avatar_url ? (
                    <img
                      src={actorProfile.avatar_url}
                      alt={actorName}
                      className="h-12 w-12 shrink-0 rounded-2xl border border-slate-700 object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-sm font-semibold">
                      {actorName.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-sm text-slate-400">Actor</div>
                    <div className="truncate font-semibold text-slate-100">
                      {actorName}
                    </div>

                    {targetName ? (
                      <div className="mt-1 text-sm text-slate-400">
                        Target: {targetName}
                      </div>
                    ) : null}

                    <div className="mt-3 text-base leading-7 text-slate-100">
                      {summary}
                    </div>

                    {comment?.body ? (
                      <blockquote className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-slate-300">
                        {comment.body}
                      </blockquote>
                    ) : null}

                    {thread?.title || thread?.body ? (
                      <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4">
                        {thread?.title ? (
                          <div className="font-semibold text-slate-100">
                            {thread.title}
                          </div>
                        ) : null}

                        {thread?.body ? (
                          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-300">
                            {thread.body}
                          </p>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="mt-4 text-xs text-slate-500">
                      {formatTime(log.created_at)}
                    </div>

                    {Object.keys(details).length > 0 ? (
                      <details className="mt-4">
                        <summary className="cursor-pointer text-sm text-slate-400 hover:text-slate-200">
                          Show technical details
                        </summary>
                        <pre className="mt-3 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs text-slate-300">
                          {JSON.stringify(details, null, 2)}
                        </pre>
                      </details>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}