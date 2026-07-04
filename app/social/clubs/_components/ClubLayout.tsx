import type { ReactNode } from "react";

import { ClubQuickLinks } from "./ClubQuickLinks";
import type { Club } from "../_lib/types";

type ActiveSection = "club" | "members" | "invite" | "forum" | "settings";

type Props = {
  club: Club;
  active: ActiveSection;
  children: ReactNode;
};

export function ClubLayout({ club, active, children }: Props) {
  const base = `/social/clubs/${club.title_search}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/20">
          <div className="relative h-56 w-full bg-slate-800">
            {club.banner_url ? (
              <img
                src={club.banner_url}
                alt={club.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : null}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 flex items-end gap-6 p-6">
              {club.avatar_url ? (
                <img
                  src={club.avatar_url}
                  alt={club.title}
                  className="h-28 w-28 rounded-3xl border-4 border-slate-950 object-cover"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-slate-950 bg-slate-800 text-3xl font-bold">
                  {club.title.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 pb-2">
                <h1 className="truncate text-4xl font-bold">{club.title}</h1>

                <p className="mt-2 max-w-3xl text-sm text-slate-300">
                  {club.description || "No club description yet."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="space-y-6">
            <ClubQuickLinks base={base} active={active} />
          </aside>

          <main>{children}</main>
        </div>
      </div>
    </div>
  );
}