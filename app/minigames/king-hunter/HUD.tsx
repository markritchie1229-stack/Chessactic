"use client";

type HUDProps = {
  tierLabel: string;
  puzzleNumber: number;
  puzzleCount: number;
  movesRemaining: number;
  status: "idle" | "playing" | "won" | "lost";
  message: string;
  sideToMove: "white" | "black";
  engineBusy?: boolean;
};

function statusLabel(status: HUDProps["status"], engineBusy: boolean) {
  if (status === "playing") return engineBusy ? "Engine thinking" : "Live";
  if (status === "won") return "Cleared";
  if (status === "lost") return "Game over";
  return "Idle";
}

export default function HUD({
  tierLabel,
  puzzleNumber,
  puzzleCount,
  movesRemaining,
  status,
  message,
  sideToMove,
  engineBusy = false,
}: HUDProps) {
  const isWhiteToMove = sideToMove === "white";

  return (
    <div className="space-y-4 rounded-[2rem] border border-[#9b7b40]/25 bg-gradient-to-br from-[#1a1512] via-[#100d0b] to-[#070605] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
      <div className="rounded-[1.5rem] border border-[#d7ab32]/20 bg-[radial-gradient(circle_at_top,rgba(255,244,210,0.06),rgba(255,255,255,0)_58%)] p-4">
        <div className="text-xs uppercase tracking-[0.35em] text-amber-200/60">
          Forged Kings
        </div>
        <div className="mt-2 text-3xl font-semibold text-amber-50">{tierLabel}</div>
        <p className="mt-2 max-w-md text-sm leading-6 text-stone-300">
          Solve the forced mate before the board runs out of room.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-[1.35rem] border border-[#d7ab32]/20 bg-black/25 p-4">
          <div className="text-[11px] uppercase tracking-[0.28em] text-amber-200/55">
            Side to move
          </div>
          <div className="mt-2 flex items-center gap-3 text-lg font-semibold text-amber-50">
            <span
              className={[
                "inline-flex h-3 w-3 rounded-full",
                isWhiteToMove ? "bg-amber-100 shadow-[0_0_10px_rgba(255,236,179,0.5)]" : "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.45)]",
              ].join(" ")}
            />
            {isWhiteToMove ? "White" : "Black"}
          </div>
        </div>

        <div className="rounded-[1.35rem] border border-[#d7ab32]/20 bg-black/25 p-4">
          <div className="text-[11px] uppercase tracking-[0.28em] text-amber-200/55">
            Puzzle
          </div>
          <div className="mt-2 text-2xl font-semibold text-amber-50">
            {puzzleNumber} / {puzzleCount}
          </div>
        </div>

        <div className="rounded-[1.35rem] border border-[#d7ab32]/20 bg-black/25 p-4">
          <div className="text-[11px] uppercase tracking-[0.28em] text-amber-200/55">
            Status
          </div>
          <div className="mt-2 text-2xl font-semibold text-amber-50">
            {statusLabel(status, engineBusy)}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.35rem] border border-[#d7ab32]/20 bg-black/25 p-4">
          <div className="text-[11px] uppercase tracking-[0.28em] text-amber-200/55">
            Remaining strikes
          </div>
          <div className="mt-2 text-2xl font-semibold text-amber-50">
            {movesRemaining}
          </div>
        </div>

        <div className="rounded-[1.35rem] border border-[#d7ab32]/20 bg-[radial-gradient(circle_at_top,rgba(255,170,74,0.12),rgba(0,0,0,0)_60%)] p-4 text-sm leading-6 text-stone-200">
          {message}
        </div>
      </div>
    </div>
  );
}
