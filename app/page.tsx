"use client";

import { LegalRail } from "./components/LegalRail";
import { ReportRail } from "./components/ReportRail";
import { AdminModerationRail } from "./components/AdminModerationRail";
import { useEffect, useMemo, useState } from "react";
import { Chess, type Square } from "chess.js";
import ChessBoard from "./components/ChessBoard";
import {
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  Shuffle,
} from "lucide-react";
import { AccountRail } from "./components/AccountRail";
import { SocialRail } from "./components/SocialRail";
import { StatsRail } from "./components/StatsRail";
import { MiniGamesRail } from "./components/MiniGamesRail";
import { ThemeRail } from "./components/ThemeRail";
import { DailyRail } from "./components/DailyRail";
import { useTheme } from "@/components/ThemeProvider";
import { supabase } from "@/lib/supabase";

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
  categoryId: string;
  categoryLabel: string;
  puzzleKey: string;
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
    file: "/discovered_attacks.pawn_only_first_moves.json",
  },
  {
    id: "forks",
    label: "Forks",
    file: "/forks_filtered.json",
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
    file: "/Mates.In.3.Complete.Rated_deduped.json",
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

const ALL_CATEGORY_ID = "__all__";

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

function normalizePuzzle(raw: RawPuzzle, category: Category): Puzzle {
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
    categoryId: category.id,
    categoryLabel: category.label,
    puzzleKey: `${category.id}|${raw.fen}|${raw.solution}`,
  };
}

function shuffleArray<T>(items: T[]) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function interleavePuzzleGroups(groups: Puzzle[][]) {
  const maxLen = Math.max(0, ...groups.map((group) => group.length));
  const output: Puzzle[] = [];

  for (let i = 0; i < maxLen; i += 1) {
    for (const group of groups) {
      const puzzle = group[i];
      if (puzzle) {
        output.push(puzzle);
      }
    }
  }

  return output;
}

function getSurfaceStyles(themeId: string) {
  if (themeId === "lilac") {
    return {
      page: "linear-gradient(180deg, #fff6fb 0%, #fdeaf4 44%, #f9dceb 100%)",
      panel:
        "linear-gradient(135deg, rgba(255,255,255,0.72) 0%, rgba(255,232,245,0.64) 100%)",
      panelBorder: "rgba(236,72,153,0.22)",
      card:
        "linear-gradient(180deg, rgba(255,255,255,0.82) 0%, rgba(255,239,248,0.78) 100%)",
      control:
        "linear-gradient(180deg, rgba(255,255,255,0.88) 0%, rgba(255,232,245,0.84) 100%)",
      ink: "#4b5563",
    };
  }

  if (themeId === "standard") {
    return {
      page: "linear-gradient(180deg, #020617 0%, #0f172a 48%, #020617 100%)",
      panel:
        "linear-gradient(135deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.88) 100%)",
      panelBorder: "rgba(71,85,105,0.9)",
      card:
        "linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(2,6,23,0.88) 100%)",
      control:
        "linear-gradient(180deg, rgba(15,23,42,0.96) 0%, rgba(30,41,59,0.90) 100%)",
      ink: "#e2e8f0",
    };
  }

  return {
    page: "linear-gradient(180deg, #070605 0%, #120f0c 42%, #070605 100%)",
    panel:
      "linear-gradient(135deg, rgba(26,21,18,0.96) 0%, rgba(16,13,11,0.90) 100%)",
    panelBorder: "rgba(217,190,121,0.25)",
    card:
      "linear-gradient(180deg, rgba(26,21,18,0.98) 0%, rgba(10,8,6,0.92) 100%)",
    control:
      "linear-gradient(180deg, rgba(26,21,18,0.98) 0%, rgba(16,13,11,0.94) 100%)",
    ink: "#f8fafc",
  };
}

export default function Page() {
  const { theme } = useTheme();
  const surface = getSurfaceStyles(theme.id);
  const labelColor = theme.id === "lilac" ? "#6b7280" : "#94a3b8";
  const valueColor = theme.id === "lilac" ? "#9d174d" : surface.ink;

  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([
    CATEGORIES[0].id,
  ]);
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(true);

  const [index, setIndex] = useState(0);
  const [game, setGame] = useState<Chess | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [message, setMessage] = useState("Choose categories to begin.");
  const [solved, setSolved] = useState(false);
  const [moveLog, setMoveLog] = useState<string[]>([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [userColor, setUserColor] = useState<"w" | "b">("w");
  const [showHint, setShowHint] = useState(false);

  const selectedCategoryLabel =
    selectedCategoryIds.length === CATEGORIES.length
      ? "All categories"
      : selectedCategoryIds.length === 1
        ? CATEGORIES.find((c) => c.id === selectedCategoryIds[0])?.label ??
          "Selected categories"
        : `${selectedCategoryIds.length} categories`;

  const categoryOptions = [
    { id: ALL_CATEGORY_ID, label: "All" },
    ...CATEGORIES.map((c) => ({ id: c.id, label: c.label })),
  ];

  const puzzle = puzzles[index];
  const boardOrientation = userColor === "w" ? "white" : "black";
  const legalTargets = useMemo(() => {
    if (!selectedSquare || !game) return [];

    return game
      .moves({ square: selectedSquare, verbose: true })
      .map((move) => move.to as Square);
  }, [game, selectedSquare]);

  const recordSolvedPuzzle = async (p: Puzzle) => {
    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) return;

      const { data: didInsert, error } = await supabase.rpc(
        "register_solved_puzzle",
        {
          p_user_id: user.id,
          p_puzzle_key: p.puzzleKey,
          p_category_id: p.categoryId,
          p_fen: p.fen,
          p_solution: p.solution,
          p_theme: p.theme ?? null,
          p_difficulty: p.difficulty ?? null,
        },
      );

      if (error) throw error;

      if (didInsert) {
        window.dispatchEvent(
          new CustomEvent("profile-metrics-updated", {
            detail: { gamesSolvedDelta: 1 },
          }),
        );
      }
    } catch (err) {
      console.warn("Could not record solved puzzle:", err);
    }
  };

  const recordFailedAttempt = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) return;

      const { error } = await supabase.rpc("register_failed_attempt", {
        p_user_id: user.id,
      });

      if (error) throw error;

      window.dispatchEvent(
        new CustomEvent("profile-metrics-updated", {
          detail: { failedAttemptDelta: 1 },
        }),
      );
    } catch (err) {
      console.warn("Could not record failed attempt:", err);
    }
  };

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

  const toggleCategory = (id: string) => {
    if (id === ALL_CATEGORY_ID) {
      setSelectedCategoryIds(CATEGORIES.map((c) => c.id));
      return;
    }

    setSelectedCategoryIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      return next.length > 0 ? next : prev;
    });
  };

  const loadCategories = async (ids: string[]) => {
    const selectedIds =
      ids.length === CATEGORIES.length ? CATEGORIES.map((c) => c.id) : ids;

    if (selectedIds.length === 0) {
      setPuzzles([]);
      setGame(null);
      setMessage("Choose at least one category.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage(`Loading ${selectedCategoryLabel}...`);
    setSolved(false);
    setMoveLog([]);
    setSelectedSquare(null);
    setLineIndex(0);
    setShowHint(false);

    try {
      const selectedCategories = CATEGORIES.filter((c) =>
        selectedIds.includes(c.id),
      );

      const loadedGroups = await Promise.all(
        selectedCategories.map(async (cat) => {
          const res = await fetch(encodeURI(cat.file));
          if (!res.ok) {
            throw new Error(`HTTP ${res.status} while loading ${cat.file}`);
          }

          const raw = (await res.json()) as RawPuzzle[];
          const puzzlesForCategory = raw
            .filter(Boolean)
            .map((p) => normalizePuzzle(p, cat));

          return shuffleArray(puzzlesForCategory);
        }),
      );

      const merged = interleavePuzzleGroups(loadedGroups);

      setPuzzles(merged);
      setIndex(0);

      if (merged.length > 0) {
        const firstGame = new Chess(merged[0].fen);
        setGame(firstGame);
        setUserColor(firstGame.turn());
        setMessage(
          `Loaded ${merged.length} puzzles from ${selectedCategoryLabel}.`,
        );
      } else {
        setGame(null);
        setMessage(`No valid puzzles found in ${selectedCategoryLabel}.`);
      }
    } catch (err) {
      console.error(err);
      setPuzzles([]);
      setGame(null);
      setMessage(`Could not load puzzles for ${selectedCategoryLabel}.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories(selectedCategoryIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategoryIds]);

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

      if (!userResult) {
        void recordFailedAttempt();
        setMessage("That move is illegal or does not match the solution line.");
        return false;
      }

      const playedMove = userResult.promotion
        ? `${from}${to}${userResult.promotion}`.toLowerCase()
        : `${from}${to}`;

      if (!isSameMove(playedMove, expectedMove)) {
        void recordFailedAttempt();
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
          `Auto: ${moveToUci(autoSpec.from, autoSpec.to, autoSpec.promotion)}`,
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
        void recordSolvedPuzzle(puzzle);
      } else {
        setMessage("Correct.");
      }

      return true;
    } catch (err) {
      console.error(err);
      void recordFailedAttempt();
      setMessage("That move is illegal or does not match the solution line.");
      return false;
    }
  };

  const handleSquareClick = (square: Square) => {
    if (solved || !game || !puzzle) return;

    if (!selectedSquare) {
      const piece = game.get(square);
      if (piece && piece.color === game.turn()) {
        setSelectedSquare(square);
      }
      return;
    }

    if (selectedSquare === square) {
      setSelectedSquare(null);
      return;
    }

    const moved = tryMove(selectedSquare, square);
    setSelectedSquare(null);

    if (!moved) {
      setMessage("Illegal move or wrong move in the solution line.");
    }
  };

  const selectedButtonClass =
    theme.id === "lilac"
      ? "border-pink-200/80 bg-pink-50 text-pink-950 shadow-sm shadow-pink-200/40"
      : theme.id === "standard"
        ? "border-blue-100 bg-blue-50 text-slate-950 shadow-sm shadow-blue-200/40"
        : "border-amber-100 bg-amber-50 text-slate-950 shadow-sm shadow-amber-200/40";

  const unselectedButtonClass =
    theme.id === "lilac"
      ? "border-pink-200/60 bg-white/70 text-slate-700 hover:bg-pink-50"
      : theme.id === "standard"
        ? "border-slate-700 bg-slate-900/80 text-slate-100 hover:bg-slate-800"
        : "border-amber-700/35 bg-[#140f0d] text-amber-50 hover:bg-[#1b1411]";

  return (
    <main
      className="min-h-screen text-slate-100 transition-colors duration-300"
      style={{ background: surface.page }}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div
              className="mb-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm"
              style={{
                borderColor: surface.panelBorder,
                background: surface.card,
                color:
                  theme.id === "lilac"
                    ? "#be185d"
                    : theme.id === "standard"
                      ? "#e2e8f0"
                      : "#e7c36a",
              }}
            >
              Chess Trainer
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Chess Puzzle Trainer
            </h1>
            <p className="mt-2 max-w-2xl text-sm md:text-base" style={{ color: labelColor }}>
              Pick one or more categories, then solve puzzles one by one.
            </p>

            <div className="mt-4">
              <div className="mb-2 text-sm" style={{ color: labelColor }}>
                Mix categories:
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {categoryOptions.map((option) => {
                  const active =
                    option.id === ALL_CATEGORY_ID
                      ? selectedCategoryIds.length === CATEGORIES.length
                      : selectedCategoryIds.includes(option.id);

                  return (
                    <button
                      key={option.id}
                      onClick={() => toggleCategory(option.id)}
                      className={`rounded-2xl border px-3 py-2 text-left text-sm transition ${
                        active ? selectedButtonClass : unselectedButtonClass
                      }`}
                      style={{
                        borderColor: active ? theme.background.accent : surface.panelBorder,
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={randomPuzzle}
              disabled={loading || !puzzles.length}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-medium transition disabled:opacity-50"
              style={{
                color:
                  theme.id === "lilac"
                    ? "#9d174d"
                    : theme.id === "standard"
                      ? "#0f172a"
                      : "#0f172a",
                background:
                  theme.id === "lilac"
                    ? "linear-gradient(180deg, #fff 0%, #ffe4f1 100%)"
                    : "linear-gradient(180deg, #fff5d6 0%, #f0d9b5 100%)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
              }}
            >
              <Shuffle className="h-4 w-4" />
              Random
            </button>
            <button
              onClick={nextPuzzle}
              disabled={loading || !puzzles.length}
              className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition disabled:opacity-50"
              style={{
                borderColor: surface.panelBorder,
                background: surface.control,
                color: surface.ink,
              }}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => resetPuzzle()}
              disabled={loading || !puzzles.length}
              className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-medium transition disabled:opacity-50"
              style={{
                borderColor: surface.panelBorder,
                background: surface.control,
                color: surface.ink,
              }}
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[120px_minmax(0,1.05fr)_360px]">
          <div className="lg:sticky lg:top-6 self-start flex flex-col gap-3">
            <AccountRail />
            <SocialRail />
            <StatsRail />
            <MiniGamesRail />
            <ThemeRail />
            <DailyRail />
            <ReportRail />
            <LegalRail />
  <AdminModerationRail />
          </div>

          <div
            className="rounded-3xl border p-4 shadow-2xl shadow-black/20"
            style={{
              borderColor: surface.panelBorder,
              background: surface.panel,
            }}
          >
            <div className="w-full max-w-[640px]">
              {game ? (
                <ChessBoard
                  key={`${theme.id}-${index}`}
                  board={game}
                  selectedSquare={selectedSquare}
                  legalTargets={legalTargets}
                  orientation={boardOrientation}
                  onSquareClick={handleSquareClick}
                />
              ) : (
                <div
                  className="flex aspect-square items-center justify-center rounded-2xl border text-slate-400"
                  style={{ borderColor: surface.panelBorder, background: surface.card }}
                >
                  {loading ? "Loading..." : "No puzzle loaded"}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div
              className="rounded-3xl border p-5 shadow-lg"
              style={{
                borderColor: surface.panelBorder,
                background: surface.panel,
              }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-wide" style={{ color: labelColor }}>
                    Current selection
                  </div>
                  <div className="mt-1 text-xl font-semibold" style={{ color: valueColor }}>
                    {selectedCategoryLabel}
                  </div>
                </div>
                {solved ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Solved
                  </div>
                ) : null}
              </div>

              <div
                className="mt-4 rounded-2xl border p-4 text-sm"
                style={{
                  borderColor: surface.panelBorder,
                  background: surface.card,
                  color: valueColor,
                }}
              >
                {message}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div
                  className="rounded-2xl border p-3"
                  style={{ borderColor: surface.panelBorder, background: surface.card }}
                >
                  <div style={{ color: labelColor }}>Puzzle count</div>
                  <div className="mt-1 font-medium" style={{ color: valueColor }}>
                    {puzzles.length || "-"}
                  </div>
                </div>
                <div
                  className="rounded-2xl border p-3"
                  style={{ borderColor: surface.panelBorder, background: surface.card }}
                >
                  <div style={{ color: labelColor }}>Side to move</div>
                  <div className="mt-1 font-medium" style={{ color: valueColor }}>
                    {game?.turn() === "w" ? "White" : "Black"}
                  </div>
                </div>
                <div
                  className="rounded-2xl border p-3"
                  style={{ borderColor: surface.panelBorder, background: surface.card }}
                >
                  <div style={{ color: labelColor }}>Current puzzle type</div>
                  <div className="mt-1 font-medium" style={{ color: valueColor }}>
                    {puzzle?.categoryLabel ?? "-"}
                  </div>
                </div>
                <div
                  className="rounded-2xl border p-3"
                  style={{ borderColor: surface.panelBorder, background: surface.card }}
                >
                  <div style={{ color: labelColor }}>Moves played</div>
                  <div className="mt-1 font-medium" style={{ color: valueColor }}>
                    {moveLog.length}
                  </div>
                </div>
              </div>

              
            </div>

            <div
              className="rounded-3xl border p-5 shadow-lg"
              style={{
                borderColor: surface.panelBorder,
                background: surface.panel,
              }}
            >
              <div className="text-sm uppercase tracking-wide" style={{ color: labelColor }}>
                Move log
              </div>
              <div className="mt-3 space-y-2">
                {moveLog.length === 0 ? (
                  <div className="text-sm" style={{ color: labelColor }}>
                    No moves yet.
                  </div>
                ) : (
                  moveLog.map((move, i) => (
                    <div
                      key={`${move}-${i}`}
                      className="rounded-2xl border px-3 py-2 text-sm"
                      style={{
                        borderColor: surface.panelBorder,
                        background: surface.card,
                        color: valueColor,
                      }}
                    >
                      {i + 1}. {move}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div
              className="rounded-3xl border p-5 shadow-lg"
              style={{
                borderColor: surface.panelBorder,
                background: surface.panel,
              }}
            >
              <div className="text-sm uppercase tracking-wide" style={{ color: labelColor }}>
                Continuation preview
              </div>
              <div className="mt-3 text-sm">
                {puzzle?.previewLine.length ? (
                  <div className="space-y-2">
                    {puzzle.previewLine.map((step, i) => (
                      <div
                        key={`${step}-${i}`}
                        className="rounded-2xl border px-3 py-2"
                        style={{
                          borderColor: surface.panelBorder,
                          background: surface.card,
                          color: valueColor,
                        }}
                      >
                        {i + 1}. {step}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ color: labelColor }}>No preview available.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
