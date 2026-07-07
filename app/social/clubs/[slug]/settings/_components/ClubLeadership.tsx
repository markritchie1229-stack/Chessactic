"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Crown, Loader2 } from "lucide-react";

import {
  searchClubMemberByUsername,
  transferLeadership,
} from "../../../_lib/server-actions";

import type {
  Club,
  ClubMember,
  ClubRank,
} from "../../../_lib/types";

type Props = {
  club: Club;
  actorRank: ClubRank;
  currentMember: ClubMember;
};

export function ClubLeadership({
  club,
  actorRank,
  currentMember,
}: Props) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [member, setMember] = useState<ClubMember | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isPending, startTransition] = useTransition();

  async function searchMember() {
    setError("");
    setStatus("");

    const term = username.trim();

    if (!term) {
      setMember(null);
      return;
    }

    startTransition(async () => {
      try {
        const result = await searchClubMemberByUsername(club.id, term);

        if (!result) {
          setMember(null);
          setError("Member not found.");
          return;
        }

        if (result.member.id === currentMember.id) {
          setMember(null);
          setError("You are already the current leader.");
          return;
        }

        setMember(result.member);
        setStatus(
          result.profile?.username
            ? `Found ${result.profile.username}.`
            : "Member found."
        );
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Search failed."
        );
      }
    });
  }

  function handleTransfer() {
    if (!member || isPending) return;

    const confirmed = window.confirm(
      `Transfer leadership to ${username}?\n\nYou will become Co-Leader.`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setStatus("");

    startTransition(async () => {
      try {
        await transferLeadership(
          club.id,
          actorRank,
          currentMember,
          member
        );

        setStatus("Leadership transferred successfully.");
        setMember(null);
        setUsername("");
        router.refresh();
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Transfer failed."
        );
      }
    });
  }

  if (actorRank !== "leader") {
    return null;
  }

  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
      <div className="mb-4 flex items-center gap-3">
        <Crown className="h-5 w-5 text-amber-400" />

        <div>
          <h2 className="text-xl font-semibold">Leadership</h2>
          <p className="mt-2 text-sm text-slate-400">
            Transfer ownership of this club.
          </p>
        </div>
      </div>

      {status && (
        <div className="mb-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {status}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <label className="grid gap-2">
          <span className="text-sm font-medium">Member username</span>

          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Search by username"
            className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 outline-none focus:border-cyan-500"
          />
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={searchMember}
            disabled={isPending}
            className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2 hover:border-cyan-500 disabled:opacity-50"
          >
            {isPending ? "Searching..." : "Search member"}
          </button>

          <button
            type="button"
            disabled={!member || isPending}
            onClick={handleTransfer}
            className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-50"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Transferring...
              </>
            ) : (
              <>
                <Crown className="h-4 w-4" />
                Transfer Leadership
              </>
            )}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-6 text-slate-400">
          <p>Only the current Leader can transfer leadership.</p>

          <p className="mt-2">
            Once transferred, you automatically become <strong>Co-Leader</strong>.
          </p>

          <p className="mt-2">
            This action will be permanently recorded in the club audit log.
          </p>
        </div>
      </div>
    </section>
  );
}