"use client";

import Link from "next/link";
import { Copy, Database, History, Loader2, Shield, ShieldCheck, Sparkles } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { setJoinPolicy } from "../../../_lib/server-actions";
import type { Club, ClubRank } from "../../../_lib/types";
import { formatRank } from "../../../_lib/ranks";

type Props = {
  club: Club;
  actorRank: ClubRank;
};

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ClubSettingsInfo({ club, actorRank }: Props) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [joinPolicy, setLocalJoinPolicy] = useState<"open" | "request">(
    club.join_policy,
  );
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const canManageJoinPolicy = actorRank === "leader" || actorRank === "co_leader";

  async function copyClubId() {
    try {
      await navigator.clipboard.writeText(club.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
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
      <div className="mb-5 flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-cyan-400" />
        <div>
          <h2 className="text-xl font-semibold">Club control panel</h2>
          <p className="mt-2 text-sm text-slate-400">
            Quick facts, membership controls, and debugging details for this club.
          </p>
        </div>
      </div>

      {canManageJoinPolicy ? (
        <div className="mb-6 rounded-3xl border border-slate-800 bg-slate-950/60 p-5">
          <div className="mb-4 flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="text-lg font-semibold">Join settings</h3>
              <p className="mt-1 text-sm text-slate-400">
                Only Leaders and Co-Leaders can change whether this club is open or request-only.
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
            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition hover:border-cyan-500/60">
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

            <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-4 transition hover:border-cyan-500/60">
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
              Current: {" "}
              <span className="font-medium text-slate-200">
                {club.join_policy === "open" ? "Anyone can join" : "Request to join"}
              </span>
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
            <Shield className="h-4 w-4 text-cyan-400" />
            Your rank
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-50">
            {formatRank(actorRank)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
            <Database className="h-4 w-4 text-cyan-400" />
            Club ID
          </div>

          <div className="mt-3 flex items-start justify-between gap-3">
            <p className="min-w-0 break-all text-sm text-slate-300">
              {club.id}
            </p>

            <button
              type="button"
              onClick={copyClubId}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-100 transition hover:border-cyan-500 hover:bg-slate-800"
            >
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-100">
            <History className="h-4 w-4 text-cyan-400" />
            Audit log
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-300">
            Every club action should be recorded here once the audit wiring is complete.
          </p>

          <Link
            href={`/social/clubs/${club.title_search}/settings/audit`}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-100 transition hover:border-cyan-500 hover:bg-slate-800"
          >
            Open audit log
          </Link>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-sm font-medium text-slate-100">Created</div>
          <p className="mt-3 text-sm text-slate-300">
            {formatDate(club.created_at)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-sm font-medium text-slate-100">Last updated</div>
          <p className="mt-3 text-sm text-slate-300">
            {formatDate(club.updated_at)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-sm font-medium text-slate-100">Title search key</div>
          <p className="mt-3 break-all text-sm text-slate-300">
            {club.title_search}
          </p>
        </div>
      </div>
    </section>
  );
}
