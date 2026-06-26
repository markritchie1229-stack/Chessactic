"use client";

import { useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import { Chessboard } from "react-chessboard";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  RefreshCw,
  Shuffle,
} from "lucide-react";

type RawPuzzle = {
  fen: string;
  solution: string;
  san?: string;
  theme?: string;
  difficulty?: number;
  solution_line?: string[];
  sample_line?: string[];
  winning_sequence?: Array<{ uci?: string; san?: string }>;
};

type Puzzle = {
  fen: string;
  solution: string;
  playableLine: string[];
  previewLine: string[];
  san?: string;
  theme?: string;
  difficulty?: number;
};

type Category = {
  id: string;
  label: string;
  file: string;
};

const CATEGORIES: Category[] = [
  {
    id: "discovered_attack",
    label: "Discovered Attacks",
    file: "/Discovered.Attacks.Complete.Rated_deduped_filled.json",
  },
  {
    id: "forks",
    label: "Forks",
    file: "/Forks.Complete.Rated_deduped_filled.json",
  },
  {
    id: "hanging_pieces",
    label: "Hanging Pieces",
    file: "/Hanging.Pieces.Complete.Rated_deduped_filled.json",
  },
  {
    id: "mate_1",
    label: "Mate in 1",
    file: "/Mate.In.1.Complete.Rated_deduped.json",
  },
  {
    id: "mate_2",
    label: "Mate in 2",
    file: "/Mate.In.2.Complete.Rated_deduped.json",
  },
  {
    id: "mate_3",
    label: "Mate in 3",
    file: "/Mate.In.3.Complete.Rated_deduped.json",
  },
  {
    id: "pins",
    label: "Pins",
    file: "/Pins.Complete.Rated_deduped_filled.json",
  },
  {
    id: "skewers",
    label: "Skewers",
    file: "/Skewers.Complete.Rated_deduped_filled.json",
  },
];

type MoveSpec = {
  from: Square;
  to: Square;
  promotion?: string;
};

function normalizeUci(move: string) {
  return move.toLowerCase().trim();
}

function isSameMove(played: string, expected: string) {
  return normalizeUci(played) === normalizeUci(expected);
}

function parseUciMove(uci: string): MoveSpec {
  const move = normalizeUci(uci);

  if (move.length < 4) {
    throw new Error(`Invalid UCI move: ${uci}`);
  }

  const from = move.slice(0, 2) as Square;
  const to = move.slice(2, 4) as Square;
  const promotion = move.length > 4 ? move.slice(4, 5) : undefined;

  return promotion ? { from, to, promotion } : { from, to };
}

function moveToUci(from: Square, to: Square, promotion?: string) {
  return `${from}${to}${promotion ?? ""}`.toLowerCase();
}

function applyMove(trial: Chess, spec: MoveSpec) {
  if (spec.promotion) {
    const promoted = trial.move({
      from: spec.from,
      to: spec.to,
      promotion: spec.promotion,
    });
    if (promoted) return promoted;
  }

  const normal = trial.move({ from: spec.from, to: spec.to });
  if (normal) return normal;

  if (!spec.promotion) {
    return trial.move({ from: spec.from, to: spec.to, promotion: "q" });
  }

  return null;
}

function buildPlayableLine(raw: RawPuzzle): string[] {
  const sampleLine = raw.sample_line?.filter(Boolean) ?? [];
  const explicitLine = raw.solution_line?.filter(Boolean) ?? [];

  if (sampleLine.length > 1) return sampleLine;
  if (explicitLine.length > 1) return explicitLine;

  return [raw.solution];
}

function buildPreviewLine(raw: RawPuzzle): string[] {
  return (
    raw.winning_sequence
      ?.map((m) => m.san ?? m.uci)
      .filter((x): x is string => Boolean(x)) ?? []
  );
}

function normalizePuzzle(raw: RawPuzzle): Puzzle {
  const san =
    raw.san ??
    raw.winning_sequence?.[0]?.san ??
    raw.sample_line?.[0] ??
    raw.solution_line?.[0];

  return {
    fen: raw.fen,
    solution: raw.solution,
    playableLine: buildPlayableLine(raw),
    previewLine: buildPreviewLine(raw),
    san,
    theme: raw.theme,
    difficulty: raw.difficulty,
  };
}

export default function Page() {
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);

  const [index, setIndex] = useState(0);
  const [game, setGame] = useState<Chess | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [message, setMessage] = useState("Choose a category to begin.");
  const [solved, setSolved] = useState(false);
  const [moveLog, setMoveLog] = useState<string[]>([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [userColor, setUserColor] = useState<"w" | "b">("w");
  const [showHint, setShowHint] = useState(false);

  const category = useMemo(
    () => CATEGORIES.find((c) => c.id === categoryId) ?? CATEGORIES[0],
    [categoryId]
  );

  const puzzle = puzzles[index];
  const boardOrientation = userColor === "w" ? "white" : "black";

  const resetPuzzle = (fen?: string) => {
    const targetFen = fen ?? puzzle?.fen;
    if (!targetFen) return;

    const nextGame = new Chess(targetFen);
    setGame(nextGame);
    setUserColor(nextGame.turn());
    setSelectedSquare(null);
    setMessage("Find the full solution line.");
    setSolved(false);
    setMoveLog([]);
    setLineIndex(0);
    setShowHint(false);
  };

  const loadCategory = async (id: string) => {
    const selected = CATEGORIES.find((c) => c.id === id);
    if (!selected) return;

    setLoading(true);
    setMessage(`Loading ${selected.label}...`);
    setSolved(false);
    setMoveLog([]);
    setSelectedSquare(null);
    setLineIndex(0);
    setShowHint(false);

    try {
      const res = await fetch(encodeURI(selected.file));
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} while loading ${selected.file}`);
      }

      const raw = (await res.json()) as RawPuzzle[];
      const normalized = raw.filter(Boolean).map(normalizePuzzle);

      setPuzzles(normalized);
      setIndex(0);

      if (normalized.length > 0) {
        const firstGame = new Chess(normalized[0].fen);
        setGame(firstGame);
        setUserColor(firstGame.turn());
        setMessage(`Loaded ${normalized.length} puzzles from ${selected.label}.`);
      } else {
        setGame(null);
        setMessage(`No valid puzzles found in ${selected.label}.`);
      }
    } catch (err) {
      console.error(err);
      setPuzzles([]);
      setGame(null);
      setMessage(`Could not load ${selected.label}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategory(categoryId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const nextPuzzle = () => {
    if (!puzzles.length) return;
    const next = (index + 1) % puzzles.length;
    setIndex(next);
    resetPuzzle(puzzles[next].fen);
  };

  const randomPuzzle = () => {
    if (!puzzles.length) return;
    const next = Math.floor(Math.random() * puzzles.length);
    setIndex(next);
    resetPuzzle(puzzles[next].fen);
  };

  const customSquareStyles = useMemo(() => {
    if (!selectedSquare) return {};
    return {
      [selectedSquare]: {
        background: "rgba(59, 130, 246, 0.35)",
      },
    };
  }, [selectedSquare]);

  const tryMove = (from: Square, to: Square) => {
    if (!game || !puzzle || solved) return false;
    if (lineIndex >= puzzle.playableLine.length) return false;
    if (from === to) return false;

    const expectedMove = puzzle.playableLine[lineIndex];
    if (!expectedMove) return false;

    const trial = new Chess(game.fen());

    try {
      const userResult =
        applyMove(trial, { from, to, promotion: "q" }) ??
        applyMove(trial, { from, to });

      if (!userResult) return false;

      const playedMove = userResult.promotion
        ? `${from}${to}${userResult.promotion}`.toLowerCase()
        : `${from}${to}`.toLowerCase();

      if (!isSameMove(playedMove, expectedMove)) {
        setMessage("That is not the correct move.");
        return false;
      }

      const newLog: string[] = [`You: ${playedMove}`];
      let nextIndex = lineIndex + 1;

      while (nextIndex < puzzle.playableLine.length && trial.turn() !== userColor) {
        const autoExpected = puzzle.playableLine[nextIndex];
        const autoSpec = parseUciMove(autoExpected);
        const autoResult = applyMove(trial, autoSpec);

        if (!autoResult) {
          throw new Error(`Auto-play failed on ${autoExpected}`);
        }

        newLog.push(
          `Auto: ${moveToUci(autoSpec.from, autoSpec.to, autoSpec.promotion)}`
        );
        nextIndex += 1;
      }

      setGame(trial);
      setMoveLog((prev) => [...prev, ...newLog]);
      setLineIndex(nextIndex);
      setSelectedSquare(null);

      if (nextIndex >= puzzle.playableLine.length) {
        setSolved(true);
        setMessage(`Correct. ${puzzle.san ?? puzzle.solution} completes the line.`);
      } else {
        setMessage("Correct.");
      }

      return true;
    } catch (err) {
      console.error(err);
      setMessage("That move is illegal or does not match the solution line.");
      return false;
    }
  };

  const onSquareClick = ({ square }: any) => {
    if (solved || !game || !puzzle) return;

    const sq = square as Square;

    if (!selectedSquare) {
      const piece = game.get(sq);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(sq);
      }
      return;
    }

    if (selectedSquare === sq) {
      setSelectedSquare(null);
      return;
    }

    const moved = tryMove(selectedSquare, sq);
    setSelectedSquare(null);

    if (!moved) {
      setMessage("Illegal move or wrong move in the solution line.");
    }
  };

  const onPieceDrop = ({ sourceSquare, targetSquare }: any) => {
    if (solved || !game || !puzzle) return false;
    if (!sourceSquare || !targetSquare) return false;
    if (sourceSquare === targetSquare) return false;

    const moved = tryMove(sourceSquare as Square, targetSquare as Square);
    setSelectedSquare(null);

    if (!moved) {
      setMessage("Illegal move or wrong move in the solution line.");
    }

    return moved;
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-6 md:py-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-sm text-slate-300">
              Chess Trainer
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Chess Puzzle Trainer
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400 md:text-base">
              Pick a category, then solve puzzles one by one.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-3 py-2">
              <ChevronDown className="h-4 w-4 text-slate-400" />
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="bg-transparent text-sm outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id} className="bg-slate-900">
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={randomPuzzle}
              disabled={loading || !puzzles.length}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-white disabled:opacity-50"
            >
              <Shuffle className="h-4 w-4" />
              Random
            </button>
            <button
              onClick={nextPuzzle}
              disabled={loading || !puzzles.length}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800 disabled:opacity-50"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => resetPuzzle()}
              disabled={loading || !puzzles.length}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 shadow-2xl shadow-black/20">
            <div className="w-full max-w-[640px]">
              {game ? (
                <Chessboard
                  options={{
                    position: game.fen(),
                    boardOrientation,
                    allowDragging: !solved && !!game && !!puzzle,
                    onPieceDrop,
                    onSquareClick,
                    squareStyles: customSquareStyles,
                    boardStyle: { width: "100%" },
                  }}
                />
              ) : (
                <div className="flex aspect-square items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 text-slate-400">
                  {loading ? "Loading..." : "No puzzle loaded"}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-wide text-slate-400">
                    Current category
                  </div>
                  <div className="mt-1 text-xl font-semibold">{category.label}</div>
                </div>
                {solved ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Solved
                  </div>
                ) : null}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
                {message}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-slate-500">Puzzle count</div>
                  <div className="mt-1 font-medium">{puzzles.length || "-"}</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-slate-500">Side to move</div>
                  <div className="mt-1 font-medium">
                    {game?.turn() === "w" ? "White" : "Black"}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-slate-500">Hint</div>
                  <div className="mt-1 font-medium">
                    {showHint ? puzzle?.san ?? puzzle?.solution ?? "-" : "Hidden"}
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-slate-500">Moves played</div>
                  <div className="mt-1 font-medium">{moveLog.length}</div>
                </div>
              </div>

              <button
                onClick={() => setShowHint(true)}
                disabled={showHint || !puzzle}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Show hint
              </button>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
              <div className="text-sm uppercase tracking-wide text-slate-400">
                Move log
              </div>
              <div className="mt-3 space-y-2">
                {moveLog.length === 0 ? (
                  <div className="text-sm text-slate-500">No moves yet.</div>
                ) : (
                  moveLog.map((move, i) => (
                    <div
                      key={`${move}-${i}`}
                      className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-sm text-slate-300"
                    >
                      {i + 1}. {move}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
              <div className="text-sm uppercase tracking-wide text-slate-400">
                Continuation preview
              </div>
              <div className="mt-3 text-sm text-slate-300">
                {puzzle?.previewLine.length ? (
                  <div className="space-y-2">
                    {puzzle.previewLine.map((step, i) => (
                      <div
                        key={`${step}-${i}`}
                        className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2"
                      >
                        {i + 1}. {step}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500">No preview available.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}