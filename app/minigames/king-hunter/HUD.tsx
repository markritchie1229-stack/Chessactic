"use client";

type HUDProps = {
  tierLabel: string;
  puzzleNumber: number;
  puzzleCount: number;
  movesRemaining: number;
  status: "idle" | "playing" | "won" | "lost";
  message: string;
  engineBusy?: boolean;
};

export default function HUD({
  tierLabel,
  puzzleNumber,
  puzzleCount,
  movesRemaining,
  status,
  message,
  engineBusy = false,
}: HUDProps) {
  return (
    <div className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-2xl shadow-black/20">
      <div>
        <div className="text-sm uppercase tracking-[0.2em] text-slate-400">
          King Hunter
        </div>
        <div className="mt-2 text-2xl font-bold text-slate-100">{tierLabel}</div>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Solve the forced mate before your moves run out.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Puzzle
          </div>
          <div className="mt-2 text-xl font-semibold text-slate-100">
            {puzzleNumber} / {puzzleCount}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Moves remaining
          </div>
          <div className="mt-2 text-xl font-semibold text-slate-100">
            {movesRemaining}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">
            Status
          </div>
          <div className="mt-2 text-xl font-semibold text-slate-100">
            {status === "playing"
              ? engineBusy
                ? "Engine thinking"
                : "Live"
              : status === "won"
                ? "Cleared"
                : status === "lost"
                  ? "Game over"
                  : "Idle"}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm leading-6 text-slate-300">
        {message}
      </div>
    </div>
  );
}