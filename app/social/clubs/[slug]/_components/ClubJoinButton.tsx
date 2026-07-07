"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, UserPlus } from "lucide-react";

import { joinClub } from "./../../_lib/server-actions";
import type { ClubJoinPolicy } from "./../../_lib/types";

type Props = {
  clubId: string;
  joinPolicy: ClubJoinPolicy;
};

export function ClubJoinButton({ clubId, joinPolicy }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleJoin() {
    setStatus("");
    setError("");

    startTransition(async () => {
      try {
        const result = await joinClub(clubId);

        if (result.status === "joined") {
          setStatus("You joined the club.");
        } else if (result.status === "requested") {
          setStatus("Join request sent.");
        } else {
          setStatus("You are already a member.");
        }

        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Action failed.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleJoin}
        disabled={isPending}
        className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:opacity-50"
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Working...
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" />
            {joinPolicy === "request" ? "Request to join" : "Join club"}
          </>
        )}
      </button>

      {status ? (
        <p className="text-xs text-emerald-300">{status}</p>
      ) : null}

      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}