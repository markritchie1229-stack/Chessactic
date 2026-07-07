"use client";

import { useState, useTransition } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

import { setJoinPolicy } from "./../../_lib/server-actions";
import type { Club, ClubRank } from "./../../_lib/types";

type Props = {
  club: Club;
  actorRank: ClubRank;
};

export function ClubSettingsInfo({ club, actorRank }: Props) {
  const router = useRouter();
  const [joinPolicy, setLocalJoinPolicy] = useState<"open" | "request">(
    club.join_policy,
  );
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  if (actorRank !== "leader" && actorRank !== "co_leader") {
    return null;
  }

  function saveJoinPolicy() {
    setError("");
    setStatus("");

    startTransition(async () => {
      try {
        await setJoinPolicy(club.id, joinPolicy);
        setStatus("Join policy updated.");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Update failed.");
      }
    });
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="mb-4 flex items-center gap-3">
        <ShieldCheck className="h-5 w-5 text-cyan-400" />

        <div>
          <h2 className="text-xl font-semibold">Join settings</h2>
          <p className="mt-2 text-sm text-slate-400">
            Choose whether anyone can join immediately or must request approval.
          </p>
        </div>
      </div>

      {status ? (
        <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {status}
        </div>
      ) : null}

      {error ? (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <div className="space-y-3">
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <input
            type="radio"
            name="join-policy"
            value="open"
            checked={joinPolicy === "open"}
            onChange={() => setLocalJoinPolicy("open")}
            className="mt-1"
          />
          <div>
            <div className="font-medium">Anyone can join</div>
            <p className="mt-1 text-sm text-slate-400">
              Members can join instantly without approval.
            </p>
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <input
            type="radio"
            name="join-policy"
            value="request"
            checked={joinPolicy === "request"}
            onChange={() => setLocalJoinPolicy("request")}
            className="mt-1"
          />
          <div>
            <div className="font-medium">Request to join</div>
            <p className="mt-1 text-sm text-slate-400">
              New members must wait for approval from Coordinator and above.
            </p>
          </div>
        </label>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={saveJoinPolicy}
          disabled={isPending || joinPolicy === club.join_policy}
          className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save join policy"
          )}
        </button>

        <p className="text-sm text-slate-400">
          Current:{" "}
          <span className="font-medium text-slate-200">
            {club.join_policy === "open" ? "Anyone can join" : "Request to join"}
          </span>
        </p>
      </div>
    </section>
  );
}