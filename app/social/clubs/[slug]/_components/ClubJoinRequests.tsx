"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";

import {
  approveJoinRequest,
  declineJoinRequest,
} from "./../../_lib/server-actions";

type JoinRequest = {
  id: string;
  user_id: string;
  created_at: string;
  profiles?: {
    username: string | null;
    avatar_url: string | null;
  } | null;
};

type Props = {
  requests: JoinRequest[];
};

export function ClubJoinRequests({ requests }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleAction(action: "approve" | "decline", requestId: string) {
    setError("");
    setBusyId(requestId);

    startTransition(async () => {
      try {
        if (action === "approve") {
          await approveJoinRequest(requestId);
        } else {
          await declineJoinRequest(requestId);
        }

        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed.");
      } finally {
        setBusyId(null);
      }
    });
  }

  if (requests.length === 0) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <h2 className="text-xl font-semibold">Join requests</h2>
        <p className="mt-2 text-sm text-slate-400">No pending requests.</p>
      </section>
    );
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">Join requests</h2>
        <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
          {requests.length} pending
        </span>
      </div>

      {error ? (
        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="mt-4 space-y-3">
        {requests.map((request) => {
          const name = request.profiles?.username?.trim() || request.user_id;
          const avatar = request.profiles?.avatar_url;

          return (
            <div
              key={request.id}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  {avatar ? (
                    <img
                      src={avatar}
                      alt={name}
                      className="h-11 w-11 shrink-0 rounded-2xl object-cover border border-slate-700"
                    />
                  ) : (
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-700 bg-slate-800 text-sm font-semibold">
                      {name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  <div className="min-w-0">
                    <p className="truncate font-medium">{name}</p>
                    <p className="text-xs text-slate-400">
                      Requested {new Date(request.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={isPending && busyId === request.id}
                    onClick={() => handleAction("approve", request.id)}
                    className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
                  >
                    {isPending && busyId === request.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Accept
                  </button>

                  <button
                    type="button"
                    disabled={isPending && busyId === request.id}
                    onClick={() => handleAction("decline", request.id)}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    Decline
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}