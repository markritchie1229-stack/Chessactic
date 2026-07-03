import { notFound } from "next/navigation";
import {
  Settings2,
  Shield,
  Trash2,
  UserCheck,
  Users,
} from "lucide-react";

import { getClubBySlug } from "../../_lib/queries";
import { canDisbandClub, canOpenSettings } from "../../_lib/permissions";
import { getMyClubRank } from "../../_lib/actions";
import type { ClubPageParams } from "../../_lib/types";

type PageProps = {
  params: ClubPageParams;
};

export default async function ClubSettingsPage({ params }: PageProps) {
  const { slug } = await params;

  const club = await getClubBySlug(slug);

  if (!club) {
    notFound();
  }

  const currentRank = (await getMyClubRank(club.id)) ?? "Member";
  const canAccessSettings = canOpenSettings(currentRank);

  if (!canAccessSettings) {
    return (
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-center shadow-2xl shadow-black/20">
        <h2 className="text-2xl font-semibold">Access denied</h2>
        <p className="mt-3 text-sm text-slate-400">
          Only the Leader and Co-Leader can access club settings.
        </p>
      </section>
    );
  }

  const canDisband = canDisbandClub(currentRank);

  return (
    <div className="grid gap-6">
      <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <div className="mb-4 flex items-center gap-3">
          <Settings2 className="h-5 w-5 text-cyan-400" />
          <div>
            <h2 className="text-xl font-semibold">Club controls</h2>
            <p className="mt-2 text-sm text-slate-400">
              Leader and Co-Leader controls live here.
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
            <div className="mb-2 flex items-center gap-2 font-medium text-slate-100">
              <Shield className="h-4 w-4 text-cyan-400" />
              Disband club
            </div>
            {canDisband ? "Leader only. Remove the club entirely." : "Unavailable."}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
            <div className="mb-2 flex items-center gap-2 font-medium text-slate-100">
              <UserCheck className="h-4 w-4 text-cyan-400" />
              Transfer leadership
            </div>
            Promote another member to Leader and step down.
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
            <div className="mb-2 flex items-center gap-2 font-medium text-slate-100">
              <Users className="h-4 w-4 text-cyan-400" />
              Role management
            </div>
            Promotions, demotions, mutes, and unmute controls.
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
            <div className="mb-2 flex items-center gap-2 font-medium text-slate-100">
              <Trash2 className="h-4 w-4 text-cyan-400" />
              Thread moderation
            </div>
            Delete forum threads and club chat comments.
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
            <div className="mb-2 flex items-center gap-2 font-medium text-slate-100">
              <Settings2 className="h-4 w-4 text-cyan-400" />
              Club appearance
            </div>
            Edit title, description, avatar, and background image.
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm leading-6 text-slate-300">
            <div className="mb-2 flex items-center gap-2 font-medium text-slate-100">
              <Shield className="h-4 w-4 text-cyan-400" />
              Rank rules
            </div>
            Only one Leader exists at a time. Co-Leader is the next highest role.
          </div>
        </div>
      </section>
    </div>
  );
}