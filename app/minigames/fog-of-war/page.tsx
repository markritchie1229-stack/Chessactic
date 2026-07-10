"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Chess, type Square } from "chess.js";
import {
  ArrowLeft,
  CloudFog,
  Crown,
  Play,
  RefreshCw,
  Shield,
  Sparkles,
} from "lucide-react";
import ChessBoard from "../../components/ChessBoard";
import { useTheme } from "@/components/ThemeProvider";
import { getBoardTheme } from "@/lib/boardTheme";
import { getHeaderGlow, getPageBackground, getPanelBackground } from "@/lib/backgrounds";
import { getBestMove, parseUciMove } from "./StockfishEngine";

const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function allSquares(): Square[] {
  const out: Square[] = [];
  for (const rank of RANKS) {
    for (const file of FILES) {
      out.push(`${file}${rank}` as Square);
    }
  }
  return out;
}

function moveToUci(move: { from: string; to: string; promotion?: string }) {
  return `${move.from}${move.to}${move.promotion ?? ""}`.toLowerCase();
}

function shuffle<T>(items: T[]) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randomFogSquares(existing: Set<string>, count: number) {
  const choices = shuffle(allSquares().filter((square) => !existing.has(square)));
  return choices.slice(0, count);
}

function getEngineProfile(elo: number) {
  if (elo >= 2300) return { depth: 18, timeoutMs: 9000, bestChance: 0.98, poolSize: 2 };
  if (elo >= 1800) return { depth: 17, timeoutMs: 8500, bestChance: 0.92, poolSize: 3 };
  if (elo >= 1500) return { depth: 16, timeoutMs: 8000, bestChance: 0.84, poolSize: 4 };
  if (elo >= 1200) return { depth: 15, timeoutMs: 7500, bestChance: 0.72, poolSize: 5 };
  if (elo >= 900) return { depth: 14, timeoutMs: 7000, bestChance: 0.58, poolSize: 6 };
  if (elo >= 500) return { depth: 13, timeoutMs: 6500, bestChance: 0.44, poolSize: 8 };
  return { depth: 12, timeoutMs: 6000, bestChance: 0.30, poolSize: 10 };
}

function moveHeuristic(move: { from: string; to: string; piece?: string; captured?: string; promotion?: string; flags?: string }) {
  let score = 0;
  const piece = move.piece ?? "";
  const captured = move.captured ?? "";
  const flags = move.flags ?? "";
  const toFile = move.to.charCodeAt(0) - 97;
  const toRank = Number(move.to[1]);

  if (captured) score += 20;
  if (move.promotion) score += 30;
  if (flags.includes("k") || flags.includes("q")) score += 8; // castling
  if (flags.includes("e")) score += 6; // en passant
  if (piece === "q") score += 5;
  if (piece === "r") score += 3;
  if (piece === "b") score += 4;
  if (piece === "n") score += 4;
  if (piece === "p") score += 2;
  if (toFile >= 2 && toFile <= 5 && toRank >= 3 && toRank <= 6) score += 3; // central squares

  return score;
}

export default function FogOfWarPage() {
  const { theme } = useTheme();
  const boardTheme = getBoardTheme(theme);

  const [elo, setElo] = useState(1200);
  const [gameElo, setGameElo] = useState<number | null>(null);
  const [started, setStarted] = useState(false);

  const [game, setGame] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [selectedTargets, setSelectedTargets] = useState<Square[]>([]);
  const [fogMap, setFogMap] = useState<Record<string, number>>({});
  const [plyCount, setPlyCount] = useState(0);
  const [status, setStatus] = useState("Choose a strength, then start.");
  const [moveLog, setMoveLog] = useState<string[]>([]);
  const [engineBusy, setEngineBusy] = useState(false);

  const boardSquares = useMemo(() => allSquares(), []);
  const effectiveElo = gameElo ?? elo;
  const isGameOver = game.isGameOver();

  const themeBorderColor =
    theme.id === "lilac"
      ? "rgba(236,72,153,0.22)"
      : theme.id === "standard"
        ? "rgba(51,65,85,0.95)"
        : "rgba(217,190,121,0.25)";

  const activeFogSquares = useMemo(() => {
    const fogEntries = Object.entries(fogMap) as Array<[string, number]>;
    return new Set(fogEntries.filter(([, expiresAt]) => expiresAt > plyCount).map(([square]) => square));
  }, [fogMap, plyCount]);

  const legalTargets = useMemo(() => {
    if (!selectedSquare) return [];
    return game.moves({ square: selectedSquare, verbose: true }).map((m) => m.to as Square);
  }, [game, selectedSquare]);

  const boardOrientation = "white" as const;

  const clearSelection = useCallback(() => {
    setSelectedSquare(null);
    setSelectedTargets([]);
  }, []);

  const resetGame = useCallback(() => {
    setGame(new Chess());
    setGameElo(null);
    setStarted(false);
    clearSelection();
    setFogMap({});
    setPlyCount(0);
    setMoveLog([]);
    setStatus("Choose a strength, then start.");
    setEngineBusy(false);
  }, [clearSelection]);

  const beginGame = useCallback(() => {
    setGameElo(elo);
    setGame(new Chess());
    setStarted(true);
    clearSelection();
    setFogMap({});
    setPlyCount(0);
    setMoveLog([]);
    setEngineBusy(false);
    setStatus("Make your move as White. Stockfish will reply with opaque fog.");
  }, [clearSelection, elo]);

  const addFogAfterEngineMove = useCallback((nextPly: number) => {
    setFogMap((prev) => {
      const fogEntries = Object.entries(prev) as Array<[string, number]>;
      const activeNow = new Set(fogEntries.filter(([, expiresAt]) => expiresAt > nextPly).map(([square]) => square));
      const newFogSquares = randomFogSquares(activeNow, 4);
      const nextFog: Record<string, number> = {};

      for (const [square, expiresAt] of fogEntries) {
        if (expiresAt > nextPly) nextFog[square] = expiresAt;
      }

      for (const square of newFogSquares) {
        nextFog[square] = nextPly + 4;
      }

      return nextFog;
    });
    setPlyCount(nextPly);
  }, []);

  const chooseEngineMove = useCallback(
    async (position: Chess) => {
      const legalMoves = position.moves({ verbose: true });
      if (legalMoves.length === 0) return null;

      const profile = getEngineProfile(effectiveElo);
      const result = await getBestMove(position.fen(), profile.depth, profile.timeoutMs);
      const parsed = result.bestMove ? parseUciMove(result.bestMove) : null;
      const engineMove = parsed
        ? legalMoves.find((move) => moveToUci(move) === moveToUci(parsed)) ?? null
        : null;

      const ranked = [...legalMoves]
        .map((move) => ({ move, score: moveHeuristic(move) }))
        .sort((a, b) => b.score - a.score);

      if (engineMove && effectiveElo >= 2300) {
        return engineMove;
      }

      const bestMove = engineMove ?? ranked[0]?.move ?? null;
      if (!bestMove) return null;

      if (Math.random() < profile.bestChance) {
        return bestMove;
      }

      const pool = ranked.slice(0, Math.min(profile.poolSize, ranked.length));
      if (pool.length === 0) return bestMove;

      const weights = pool.map((entry, index) => Math.max(1, 10 - index * 2 + entry.score / 10));
      const chosen = shuffle(
        pool.flatMap((entry, index) => Array(Math.max(1, Math.round(weights[index]))).fill(entry.move)),
      )[0];

      return chosen ?? bestMove;
    },
    [effectiveElo],
  );

  const finishEngineTurn = useCallback(
    async (afterPlayerMove: Chess) => {
      if (afterPlayerMove.isGameOver()) {
        setGame(afterPlayerMove);
        setStatus(
          afterPlayerMove.isCheckmate()
            ? "Checkmate."
            : afterPlayerMove.isDraw()
              ? "Draw."
              : "Game over.",
        );
        return;
      }

      setEngineBusy(true);
      setStatus("Stockfish is thinking...");

      try {
        const engineMove = await chooseEngineMove(afterPlayerMove);

        if (!engineMove) {
          setGame(afterPlayerMove);
          setStatus("Stockfish has no legal move.");
          return;
        }

        const nextPosition = new Chess(afterPlayerMove.fen());
        nextPosition.move(engineMove);

        const nextPly = plyCount + 1;
        addFogAfterEngineMove(nextPly);

        setGame(nextPosition);
        setMoveLog((prev) => [...prev, `Stockfish: ${moveToUci(engineMove)}`]);
        clearSelection();

        if (nextPosition.isGameOver()) {
          setStatus(
            nextPosition.isCheckmate()
              ? "Checkmate."
              : nextPosition.isDraw()
                ? "Draw."
                : "Game over.",
          );
          return;
        }

        setStatus("Make your move as White.");
      } finally {
        setEngineBusy(false);
      }
    },
    [addFogAfterEngineMove, chooseEngineMove, clearSelection, plyCount],
  );

  const tryPlayerMove = useCallback(
    async (from: Square, to: Square) => {
      if (!started || isGameOver || game.turn() !== "w") return false;

      const trial = new Chess(game.fen());
      const played = trial.move({ from, to, promotion: "q" }) ?? trial.move({ from, to });

      if (!played) {
        setStatus("Illegal move.");
        return false;
      }

      setGame(trial);
      setMoveLog((prev) => [...prev, `You: ${moveToUci(played)}`]);
      clearSelection();

      if (trial.isGameOver()) {
        setStatus(trial.isCheckmate() ? "Checkmate." : trial.isDraw() ? "Draw." : "Game over.");
        return true;
      }

      await finishEngineTurn(trial);
      return true;
    },
    [clearSelection, finishEngineTurn, game, isGameOver, started],
  );

  const handleSquareClick = useCallback(
    async (square: Square) => {
      if (!started || isGameOver || game.turn() !== "w" || engineBusy) return;

      const piece = game.get(square);

      if (selectedSquare) {
        if (selectedSquare === square) {
          clearSelection();
          return;
        }

        if (legalTargets.includes(square)) {
          await tryPlayerMove(selectedSquare, square);
          return;
        }

        clearSelection();
      }

      if (piece?.color === "w") {
        setSelectedSquare(square);
        setSelectedTargets(game.moves({ square, verbose: true }).map((move) => move.to as Square));
      }
    },
    [clearSelection, engineBusy, game, isGameOver, legalTargets, selectedSquare, started, tryPlayerMove],
  );

  useEffect(() => {
    if (!started) {
      setEngineBusy(false);
    }
  }, [started]);

  return (
    <main className="min-h-screen text-slate-100" style={{ background: getPageBackground(theme) }}>
      <div className="pointer-events-none fixed inset-0" style={{ background: getHeaderGlow(theme), opacity: 0.9 }} />

      <div className="mx-auto max-w-7xl px-4 py-6 md:py-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
              style={{
                borderColor: themeBorderColor,
                color: theme.background.accent,
                background: theme.id === "lilac" ? "rgba(255,255,255,0.75)" : "rgba(15,23,42,0.78)",
              }}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">Fog of War</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 md:text-base">
              Play White, and after each move Stockfish replies. Fog squares are now fully opaque.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={resetGame}
              className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition hover:bg-slate-800"
              style={{
                borderColor: themeBorderColor,
                background: getPanelBackground(theme),
                color: theme.background.accent,
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
            <button
              onClick={beginGame}
              className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition hover:bg-slate-800"
              style={{
                borderColor: themeBorderColor,
                background: getPanelBackground(theme),
                color: theme.background.accent,
              }}
            >
              <Play className="h-4 w-4" />
              Start
            </button>
          </div>
        </div>

        {!started ? (
          <div
            className="mx-auto max-w-3xl rounded-[2rem] border p-6 shadow-2xl shadow-black/20"
            style={{ borderColor: themeBorderColor, background: getPanelBackground(theme) }}
          >
            <div className="flex items-start gap-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl"
                style={{
                  background: theme.id === "lilac" ? "rgba(236,72,153,0.12)" : "rgba(215,171,50,0.10)",
                  color: theme.background.accent,
                }}
              >
                <CloudFog className="h-6 w-6" />
              </div>

              <div className="flex-1">
                <h2 className="text-2xl font-semibold">Set Stockfish strength</h2>
                <p className="mt-2 text-sm text-slate-300">Pick an ELO from 100 to 3000 before the game starts.</p>

                <div className="mt-6">
                  <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                    <span>Strength</span>
                    <span className="font-medium" style={{ color: theme.background.accent }}>
                      {elo} ELO
                    </span>
                  </div>

                  <input
                    type="range"
                    min={100}
                    max={3000}
                    step={25}
                    value={elo}
                    disabled={started}
                    onChange={(e) => setElo(clamp(Number(e.target.value), 100, 3000))}
                    className="w-full"
                  />

                  <div className="mt-2 flex justify-between text-xs text-slate-500">
                    <span>100</span>
                    <span>1500</span>
                    <span>3000</span>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={beginGame}
                    className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium text-slate-950 transition hover:opacity-90"
                    style={{
                      background: theme.id === "lilac"
                        ? "linear-gradient(180deg, #fff 0%, #ffe4f1 100%)"
                        : "linear-gradient(180deg, #fff5d6 0%, #f0d9b5 100%)",
                    }}
                  >
                    <Sparkles className="h-4 w-4" />
                    Start game
                  </button>

                  <div
                    className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm text-slate-300"
                    style={{ borderColor: themeBorderColor, background: "rgba(2,6,23,0.25)" }}
                  >
                    <Shield className="h-4 w-4" />
                    You play White
                  </div>

                  <div
                    className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm text-slate-300"
                    style={{ borderColor: themeBorderColor, background: "rgba(2,6,23,0.25)" }}
                  >
                    <Crown className="h-4 w-4" />
                    Stockfish plays Black
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_360px]">
          <div
            className="rounded-[2rem] border p-0 shadow-2xl shadow-black/20 overflow-hidden"
            style={{
              borderColor: themeBorderColor,
              background: getPanelBackground(theme),
            }}
          >
            <div
              className="relative aspect-square w-full overflow-hidden"
              style={{
                transform: theme.id === "standard" ? "scale(1.04)" : "none",
                transformOrigin: "center",
                backgroundImage: theme.board.image ? `url(${theme.board.image})` : undefined,
                backgroundColor: theme.board.image ? "transparent" : boardTheme.light,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <ChessBoard
                board={game}
                selectedSquare={selectedSquare}
                legalTargets={selectedTargets}
                orientation={boardOrientation}
                onSquareClick={(square: Square) => void handleSquareClick(square)}
                showCoordinates={false}
              />

              <div className="pointer-events-none absolute inset-0 grid grid-cols-8 grid-rows-8 overflow-hidden">
                {boardSquares.map((square) => {
                  const fogged = activeFogSquares.has(square);

                  return (
                    <div key={square} className="relative overflow-hidden">
                      {fogged ? (
                        <div className="absolute inset-0 z-30 flex items-center justify-center">
                          <div
                            className="absolute inset-0"
                            style={{
                              background: theme.id === "lilac" ? "rgba(255,247,251,1)" : "rgba(248,250,252,1)",
                            }}
                          />
                          <CloudFog className="relative z-40 h-5 w-5 text-slate-700" />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div
              className="rounded-[2rem] border p-5 shadow-lg"
              style={{
                borderColor: themeBorderColor,
                background: getPanelBackground(theme),
              }}
            >
              <div className="text-sm uppercase tracking-wide text-slate-400">Match info</div>

              <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border bg-slate-950/40 p-3" style={{ borderColor: themeBorderColor }}>
                  <div className="text-slate-400">Strength</div>
                  <div className="mt-1 font-medium" style={{ color: theme.background.accent }}>
                    {effectiveElo} ELO
                  </div>
                </div>
                <div className="rounded-2xl border bg-slate-950/40 p-3" style={{ borderColor: themeBorderColor }}>
                  <div className="text-slate-400">Mode</div>
                  <div className="mt-1 font-medium text-slate-100">Fog of War</div>
                </div>
                <div className="rounded-2xl border bg-slate-950/40 p-3" style={{ borderColor: themeBorderColor }}>
                  <div className="text-slate-400">Fog squares</div>
                  <div className="mt-1 font-medium text-slate-100">{activeFogSquares.size}</div>
                </div>
                <div className="rounded-2xl border bg-slate-950/40 p-3" style={{ borderColor: themeBorderColor }}>
                  <div className="text-slate-400">State</div>
                  <div className="mt-1 font-medium text-slate-100">{isGameOver ? "Game over" : started ? "Playing" : "Setup"}</div>
                </div>
              </div>

              <div
                className="mt-4 rounded-2xl border p-4 text-sm"
                style={{
                  borderColor: themeBorderColor,
                  background: "rgba(2,6,23,0.28)",
                  color: theme.id === "lilac" ? "#831843" : "#dbeafe",
                }}
              >
                {status}
              </div>
            </div>

            <div
              className="rounded-[2rem] border p-5 shadow-lg"
              style={{
                borderColor: themeBorderColor,
                background: getPanelBackground(theme),
              }}
            >
              <div className="text-sm uppercase tracking-wide text-slate-400">Move log</div>
              <div className="mt-3 space-y-2">
                {moveLog.length === 0 ? (
                  <div className="text-sm text-slate-400">No moves yet.</div>
                ) : (
                  moveLog.map((entry, i) => (
                    <div
                      key={`${entry}-${i}`}
                      className="rounded-2xl border bg-slate-950/40 px-3 py-2 text-sm text-slate-100"
                      style={{ borderColor: themeBorderColor }}
                    >
                      {i + 1}. {entry}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div
              className="rounded-[2rem] border p-5 shadow-lg"
              style={{
                borderColor: themeBorderColor,
                background: getPanelBackground(theme),
              }}
            >
              <div className="text-sm uppercase tracking-wide text-slate-400">Rules</div>
              <ul className="mt-3 space-y-2 text-sm text-slate-300">
                <li>Play White and make one move per turn.</li>
                <li>After each move, Stockfish replies as Black.</li>
                <li>Fog squares are opaque and fully hide the piece below.</li>
                <li>Each Stockfish reply adds four new fog squares.</li>
                <li>Fog lasts four turns and then dissipates.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
