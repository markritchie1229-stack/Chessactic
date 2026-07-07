"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Loader2,
  UserMinus,
  Volume2,
  VolumeX,
} from "lucide-react";

import {
  canKick,
  canMute,
  canPromote,
} from "../../../_lib/permissions";
import {
  demoteMember,
  kickMember,
  muteMember,
  promoteMember,
  unmuteMember,
} from "../../../_lib/server-actions";
import {
  formatRank,
  getNextHigherRank,
  getNextLowerRank,
} from "../../../_lib/ranks";
import type { ClubMember, ClubRank, Profile } from "../../../_lib/types";

type Props = {
  clubId: string;
  actorRank: ClubRank | null;
  member: ClubMember;
  profile: Profile | null;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function MemberActionsMenu({
  clubId,
  actorRank,
  member,
  profile,
}: Props) {
  const router = useRouter();
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const nextHigher = useMemo(() => getNextHigherRank(member.rank), [member.rank]);
  const nextLower = useMemo(() => getNextLowerRank(member.rank), [member.rank]);

  const canPromoteMember =
    actorRank !== null &&
    nextHigher !== null &&
    nextHigher !== "leader" &&
    canPromote(actorRank, member.rank);

  const canDemoteMember =
    actorRank !== null &&
    nextLower !== null &&
    canPromote(actorRank, member.rank);

  const canKickMember = actorRank !== null && canKick(actorRank, member.rank);
  const canMuteMember = actorRank !== null && canMute(actorRank, member.rank);

  const hasActions =
    canPromoteMember || canDemoteMember || canKickMember || canMuteMember;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function runAction(actionName: string, task: () => Promise<void>) {
    setBusyAction(actionName);
    startTransition(async () => {
      try {
        await task();
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Action failed.");
      } finally {
        setBusyAction(null);
        setOpen(false);
      }
    });
  }

  if (!hasActions) {
    return (
      <div className="shrink-0 text-sm text-slate-500">
        {formatRank(member.rank)}
      </div>
    );
  }

  return (
    <div ref={menuRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-500 hover:bg-slate-900"
      >
        Actions
        <ChevronDown className="h-4 w-4" />
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">
          <div className="border-b border-slate-800 px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-500">
            {profile?.username ?? member.user_id}
          </div>

          <div className="p-2">
            {canPromoteMember && nextHigher ? (
              <button
                type="button"
                disabled={isPending && busyAction === "promote"}
                onClick={() =>
                  runAction("promote", async () => {
                    await promoteMember(
                      clubId,
                      actorRank ?? member.rank,
                      member,
                      nextHigher,
                    );
                  })
                }
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-800"
              >
                <span className="inline-flex items-center gap-2">
                  <ArrowUp className="h-4 w-4 text-emerald-400" />
                  Promote to {formatRank(nextHigher)}
                </span>
                {isPending && busyAction === "promote" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : null}
              </button>
            ) : null}

            {canDemoteMember && nextLower ? (
              <button
                type="button"
                disabled={isPending && busyAction === "demote"}
                onClick={() =>
                  runAction("demote", async () => {
                    await demoteMember(
                      clubId,
                      actorRank ?? member.rank,
                      member,
                      nextLower,
                    );
                  })
                }
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-800"
              >
                <span className="inline-flex items-center gap-2">
                  <ArrowDown className="h-4 w-4 text-violet-400" />
                  Demote to {formatRank(nextLower)}
                </span>
                {isPending && busyAction === "demote" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : null}
              </button>
            ) : null}

            {canMuteMember ? (
              member.muted ? (
                <button
                  type="button"
                  disabled={isPending && busyAction === "unmute"}
                  onClick={() =>
                    runAction("unmute", async () => {
                      await unmuteMember(
                        clubId,
                        actorRank ?? member.rank,
                        member,
                      );
                    })
                  }
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-800"
                >
                  <span className="inline-flex items-center gap-2">
                    <Volume2 className="h-4 w-4 text-cyan-400" />
                    Unmute
                  </span>
                  {isPending && busyAction === "unmute" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : null}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isPending && busyAction === "mute"}
                  onClick={() =>
                    runAction("mute", async () => {
                      await muteMember(
                        clubId,
                        actorRank ?? member.rank,
                        member,
                      );
                    })
                  }
                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-800"
                >
                  <span className="inline-flex items-center gap-2">
                    <VolumeX className="h-4 w-4 text-amber-400" />
                    Mute
                  </span>
                  {isPending && busyAction === "mute" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : null}
                </button>
              )
            ) : null}

            {canKickMember ? (
              <button
                type="button"
                disabled={isPending && busyAction === "kick"}
                onClick={() => {
                  const confirmed = window.confirm(
                    `Kick ${profile?.username ?? member.user_id}?`,
                  );

                  if (!confirmed) return;

                  runAction("kick", async () => {
                    await kickMember(clubId, actorRank ?? member.rank, member);
                  });
                }}
                className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-800"
              >
                <span className="inline-flex items-center gap-2">
                  <UserMinus className="h-4 w-4 text-red-400" />
                  Kick
                </span>
                {isPending && busyAction === "kick" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                ) : null}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}