import type { ClubRecord } from "../_lib/types";

type ClubHeaderProps = {
  club: ClubRecord;
};

export function ClubHeader({ club }: ClubHeaderProps) {
  return (
    <header className="overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/80 shadow-2xl shadow-black/20">
      <div className="p-6 sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.28em] text-slate-400">
              Club page
            </div>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
              {club.title}
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">
              {club.description?.trim() ||
                "This club does not have a description yet."}
            </p>
          </div>

          {club.avatar_url ? (
            <img
              src={club.avatar_url}
              alt={club.title}
              className="h-20 w-20 rounded-2xl object-cover ring-1 ring-slate-700"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-950 text-slate-400 ring-1 ring-slate-700">
              <span className="text-lg font-semibold">C</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}