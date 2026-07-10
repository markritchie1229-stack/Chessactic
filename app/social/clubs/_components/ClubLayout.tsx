import type { ReactNode } from "react";

import { ClubSidebarShell } from "./ClubSidebarShell";
import { ClubQuickLinks } from "./ClubQuickLinks";
import { getClubHeaderStats } from "../_lib/server-queries";
import type { Club } from "../_lib/types";

type ActiveSection = "club" | "members" | "invite" | "forum" | "settings";

type Props = {
  club: Club;
  active: ActiveSection;
  children: ReactNode;
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function getCreatedAt(club: Club) {
  return (club as { created_at?: string | null }).created_at ?? null;
}

export async function ClubLayout({ club, active, children }: Props) {
  const base = `/social/clubs/${club.title_search}`;
  const stats = await getClubHeaderStats(club.id);
  const createdAt = getCreatedAt(club);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      {club.banner_url ? (
        <img
          src={club.banner_url}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}

      <div className="absolute inset-0 bg-slate-950/75" />
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950/20 via-slate-950/50 to-slate-950" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-white/10 bg-slate-950/35 shadow-2xl shadow-black/30 backdrop-blur-md">
          <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(360px,420px)] lg:items-center">
            <div className="flex min-w-0 flex-col items-start gap-5">
              {club.avatar_url ? (
                <img
                  src={club.avatar_url}
                  alt={club.title}
                  className="h-32 w-32 shrink-0 rounded-3xl border-4 border-slate-950 object-cover shadow-lg sm:h-36 sm:w-36 lg:h-40 lg:w-40"
                />
              ) : (
                <div className="flex h-32 w-32 shrink-0 items-center justify-center rounded-3xl border-4 border-slate-950 bg-slate-800 text-4xl font-bold shadow-lg sm:h-36 sm:w-36 lg:h-40 lg:w-40">
                  {club.title.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 max-w-4xl">
                <h1 className="break-words text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                  {club.title}
                </h1>

                <p className="mt-3 max-w-3xl break-words text-sm text-slate-200/80">
                  {club.description || "No club description yet."}
                </p>
              </div>
            </div>

            <div className="w-full rounded-3xl border border-white/10 bg-slate-950/45 p-4 shadow-lg shadow-black/20">
              <div className="grid gap-3">
                <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
                    Date Created
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-100">
                    {formatDate(createdAt)}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
                    Total Members
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-100">
                    {stats.totalMembers.toLocaleString()}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                  <div className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
                    Active Members
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-100">
                    {stats.activeMembers.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[auto_1fr]">
  <ClubSidebarShell base={base} active={active} clubId={club.id} />
  <main>{children}</main>
</div>
      </div>
    </div>
  );
}