"use client";

import { useRouter } from "next/navigation";
import { Loader2, LogOut } from "lucide-react";
import { useTransition } from "react";

import { leaveClub } from "../_lib/server-actions";

type Props = {
  clubId: string;
};

export function LeaveClubButton({ clubId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleLeave() {
    const confirmed = window.confirm(
      "Are you sure you want to leave this club?"
    );

    if (!confirmed) return;

    startTransition(async () => {
      try {
        await leaveClub(clubId);

        router.push("/social/clubs");
        router.refresh();
      } catch (err) {
        alert(
          err instanceof Error
            ? err.message
            : "Failed to leave the club."
        );
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleLeave}
      disabled={isPending}
      className="flex w-full items-center justify-center gap-3 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 font-medium text-red-300 transition hover:border-red-400 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isPending ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          Leaving...
        </>
      ) : (
        <>
          <LogOut className="h-5 w-5" />
          Leave Club
        </>
      )}
    </button>
  );
}