"use client";

import { useTheme } from "@/components/ThemeProvider";

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
  const { theme } = useTheme();
  const isWhiteToMove = sideToMove === "white";

  const shellBackground =
    theme.id === "forged-kings"
      ? "linear-gradient(135deg, #1a1512 0%, #100d0b 55%, #070605 100%)"
      : theme.id === "girly"
        ? "linear-gradient(135deg, #fff1f8 0%, #ffe4f1 55%, #ffd1e8 100%)"
        : "linear-gradient(135deg, #1e293b 0%, #0f172a 55%, #020617 100%)";

  const headerBackground =
    theme.id === "forged-kings"
      ? "radial-gradient(circle at top, rgba(255,244,210,0.06), rgba(255,255,255,0) 58%)"
      : theme.id === "girly"
        ? "radial-gradient(circle at top, rgba(255,255,255,0.5), rgba(255,255,255,0) 58%)"
        : "radial-gradient(circle at top, rgba(59,130,246,0.08), rgba(255,255,255,0) 58%)";

  const infoBackground =
    theme.id === "forged-kings"
      ? "radial-gradient(circle at top, rgba(255,170,74,0.12), rgba(0,0,0,0) 60%)"
      : theme.id === "girly"
        ? "radial-gradient(circle at top, rgba(236,72,153,0.10), rgba(0,0,0,0) 60%)"
        : "radial-gradient(circle at top, rgba(59,130,246,0.10), rgba(0,0,0,0) 60%)";

  return (
    <div
      className="space-y-4 rounded-[2rem] border p-5 shadow-[0_24px_80px_rgba(0,0,0,0.4)] transition-colors duration-300"
      style={{
        borderColor: theme.background.border,
        background: shellBackground,
      }}
    >
      <div
        className="rounded-[1.5rem] border p-4 transition-colors duration-300"
        style={{
          borderColor: theme.background.border,
          background: headerBackground,
        }}
      >
        <div
          className="text-xs uppercase tracking-[0.35em]"
          style={{ color: theme.background.accent }}
        >
          {theme.name}
        </div>
        <div className="mt-2 text-3xl font-semibold text-amber-50">
          {tierLabel}
        </div>
        <p className="mt-2 max-w-md text-sm leading-6 text-stone-300">
          Solve the forced mate before the board runs out of room.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div
          className="rounded-[1.35rem] border bg-black/25 p-4"
          style={{ borderColor: theme.background.border }}
        >
          <div className="text-[11px] uppercase tracking-[0.28em] text-slate-300/70">
            Side to move
          </div>
          <div className="mt-2 flex items-center gap-3 text-lg font-semibold text-amber-50">
            <span
              className={[
                "inline-flex h-3 w-3 rounded-full",
                isWhiteToMove
                  ? "bg-amber-100 shadow-[0_0_10px_rgba(255,236,179,0.5)]"
                  : "bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.45)]",
              ].join(" ")}
            />
            {isWhiteToMove ? "White" : "Black"}
          </div>
        </div>

        <div
          className="rounded-[1.35rem] border bg-black/25 p-4"
          style={{ borderColor: theme.background.border }}
        >
          <div className="text-[11px] uppercase tracking-[0.28em] text-slate-300/70">
            Puzzle
          </div>
          <div className="mt-2 text-2xl font-semibold text-amber-50">
            {puzzleNumber} / {puzzleCount}
          </div>
        </div>

        <div
          className="rounded-[1.35rem] border bg-black/25 p-4"
          style={{ borderColor: theme.background.border }}
        >
          <div className="text-[11px] uppercase tracking-[0.28em] text-slate-300/70">
            Status
          </div>
          <div className="mt-2 text-2xl font-semibold text-amber-50">
            {statusLabel(status, engineBusy)}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div
          className="rounded-[1.35rem] border bg-black/25 p-4"
          style={{ borderColor: theme.background.border }}
        >
          <div className="text-[11px] uppercase tracking-[0.28em] text-slate-300/70">
            Remaining strikes
          </div>
          <div className="mt-2 text-2xl font-semibold text-amber-50">
            {movesRemaining}
          </div>
        </div>

        <div
          className="rounded-[1.35rem] border p-4 text-sm leading-6 text-stone-200"
          style={{
            borderColor: theme.background.border,
            background: infoBackground,
          }}
        >
          {message}
        </div>
      </div>
    </div>
  );
}