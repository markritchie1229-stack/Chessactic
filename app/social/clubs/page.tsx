import Link from "next/link";

import { getActiveClubs } from "./_lib/server-queries";

export default async function ClubsPage() {
  const clubs = await getActiveClubs();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="text-sm uppercase tracking-[0.28em] text-slate-400">
            Social
          </div>

          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
            Clubs
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Browse every club on Chessatical. Open one to view members,
            settings, forum, chat, and more.
          </p>
        </header>

        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              Club Directory
            </h2>

            <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
              {clubs.length} club{clubs.length === 1 ? "" : "s"}
            </span>
          </div>

          {clubs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-8 text-center text-slate-400">
              No clubs have been created yet.
            </div>
          ) : (
            <div className="space-y-3">
              {clubs.map((club) => (
                <Link
                  key={club.id}
                  href={`/social/clubs/${club.title_search}`}
                  className="block rounded-2xl border border-slate-800 bg-slate-950/60 p-5 transition hover:border-cyan-500 hover:bg-slate-950"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">
                        {club.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        {club.description?.trim() ||
                          "No description yet."}
                      </p>
                    </div>

                    <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm">
                      Open →
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}