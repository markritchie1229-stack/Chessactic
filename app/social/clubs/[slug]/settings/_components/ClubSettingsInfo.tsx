"use client";

import Link from "next/link";
import { Copy, Database, History, Shield, Sparkles } from "lucide-react";
import { useState } from "react";

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
  const [copied, setCopied] = useState(false);

  async function copyClubId() {
    try {
      await navigator.clipboard.writeText(club.id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="mb-5 flex items-center gap-3">
        <Sparkles className="h-5 w-5 text-cyan-400" />
        <div>
          <h2 className="text-xl font-semibold">Club control panel</h2>
          <p className="mt-2 text-sm text-slate-400">
            Quick facts and debugging details for this club.
          </p>
        </div>
      </div>

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