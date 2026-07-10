"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

import { disbandClub } from "../../../_lib/server-actions";
import { canDisbandClub } from "../../../_lib/permissions";
import type { Club, ClubRank } from "../../../_lib/types";

type Props = {
  club: Club;
  actorRank: ClubRank;
};

export function ClubDangerZone({ club, actorRank }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!canDisbandClub(actorRank)) {
    return null;
  }

  function handleDisband() {
    const confirmed = window.confirm(
      `Are you absolutely sure?\n\n"${club.title}" will be permanently disbanded.\n\nThis action cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    startTransition(async () => {
      try {
        await disbandClub(club.id, actorRank);
        router.replace("/social/clubs");
        router.refresh();
      } catch (err) {
        alert(
          err instanceof Error ? err.message : "Unable to disband club.",
        );
      }
    });
  }

  return (
    <section className="rounded-3xl border border-red-500/30 bg-red-500/5 p-6 shadow-2xl shadow-black/20">
      <div className="mb-5 flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-red-400" />

        <div>
          <h2 className="text-xl font-semibold text-red-200">Danger Zone</h2>
          <p className="mt-2 text-sm text-red-100/80">
            These actions are permanent.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-red-500/20 bg-slate-950/60 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="font-semibold text-slate-100">Disband Club</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Permanently deletes the club, removes every member, archives all
              discussions, and records the action in the audit log.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDisband}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Disbanding...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Disband Club
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
}