"use client";

import { Loader2, ShieldAlert } from "lucide-react";

import { canOpenSettings } from "../../../_lib/permissions";
import { useCurrentClubMember } from "../../../_lib/useCurrentClubMember";
import type { Club } from "../../../_lib/types";

import { ClubAppearance } from "./ClubAppearance";
import { ClubLeadership } from "./ClubLeadership";
import { ClubDangerZone } from "./ClubDangerZone";
import { ClubSettingsInfo } from "./ClubSettingsInfo";

type Props = {
  club: Club;
  clubId: string;
  clubSlug: string;
};

export default function ClubSettingsGate({ club, clubId }: Props) {
  const { member, loading, error } = useCurrentClubMember(clubId);

  if (loading) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center">
        <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-cyan-400" />
        <h2 className="text-xl font-semibold">Checking permissions...</h2>
        <p className="mt-2 text-sm text-slate-400">
          Loading your club membership.
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="rounded-3xl border border-red-500/30 bg-red-500/10 p-8">
        <h2 className="text-xl font-semibold text-red-200">Error</h2>
        <p className="mt-3 text-sm text-red-100">{error}</p>
      </section>
    );
  }

  if (!member) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center">
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-red-400" />
        <h2 className="text-2xl font-semibold">Not a member</h2>
        <p className="mt-3 text-sm text-slate-400">
          You must belong to this club to access its settings.
        </p>
      </section>
    );
  }

  if (!canOpenSettings(member.rank)) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center">
        <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-amber-400" />
        <h2 className="text-2xl font-semibold">Access denied</h2>
        <p className="mt-3 text-sm text-slate-400">
          Only the Leader and Co-Leader can manage club settings.
        </p>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <ClubAppearance club={club} actorRank={member.rank} />
      <ClubLeadership
  club={club}
  actorRank={member.rank}
  currentMember={member}
/>
      <ClubDangerZone club={club} actorRank={member.rank} />
      <ClubSettingsInfo club={club} actorRank={member.rank} />
    </div>
  );
}