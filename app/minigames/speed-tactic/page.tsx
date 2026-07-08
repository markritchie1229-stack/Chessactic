"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { getBoardTheme } from "@/lib/boardTheme";
import { getPageBackground, getPanelBackground } from "@/lib/backgrounds";
import { Chess } from "chess.js";
import ChessBoard from "../../components/ChessBoard";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Shuffle,
  Trophy,
} from "lucide-react";

type RawPuzzle = {
  fen?: string;
  solution?: string;
  san?: string;
  theme?: string;
  difficulty?: number;
  solution_line?: string[];
  sample_line?: string[];
  winning_sequence?: Array<{ uci?: string; san?: string }>;
};

type Category = {
  id: string;
  label: string;
  file: string;
};

type Puzzle = {
  fen: string;
  solution: string;
  san: string;
  theme?: string;
  difficulty?: number;
  categoryId: string;
  categoryLabel: string;
  puzzleKey: string;
  previewLine: string[];
};

type PoolsByCategory = Record<string, Puzzle[]>;

type RoundOutcome = {
  correct: boolean;
  choice: string | null;
  timedOut: boolean;
};

const CATEGORIES: Category[] = [
  {
    id: "discovered_attack",
    label: "Discovered Attacks",
    file: "/discovered_attacks.multi.json",
  },
  {
    id: "forks",
    label: "Forks",
    file: "/mulits_fork.json",
  },
  {
    id: "hanging_pieces",
    label: "Hanging Pieces",
    file: "/Hanging.Pieces.Complete.Rated_deduped.json",
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
    file: "/Pins.Complete.Rated_deduped.json",
  },
  {
    id: "skewers",
    label: "Skewers",
    file: "/Skewers.Complete.Rated_deduped.json",
  },
] as const;

const MAX_PER_CATEGORY = 300;
const AUTO_ADVANCE_DELAY_MS = 1200;

function shuffleArray<T>(items: T[]) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function clonePools(pools: PoolsByCategory) {
  return Object.fromEntries(
    Object.entries(pools).map(([key, list]) => [key, [...list]]),
  ) as PoolsByCategory;
}

function sumPools(pools: PoolsByCategory) {
  return Object.values(pools).reduce((sum, list) => sum + list.length, 0);
}

function getRoundTime(roundNumber: number) {
  if (roundNumber <= 10) return 30;
  if (roundNumber <= 20) return 20;
  if (roundNumber <= 30) return 15;
  if (roundNumber <= 40) return 10;
  return 10;
}

function formatSeconds(seconds: number) {
  return `${Math.max(0, seconds)}s`;
}

function normalizePuzzle(raw: RawPuzzle, category: Category): Puzzle | null {
  if (!raw?.fen || !raw?.solution) return null;

  const san =
    raw.san ??
    raw.winning_sequence?.[0]?.san ??
    raw.sample_line?.[0] ??
    raw.solution_line?.[0] ??
    raw.solution;

  return {
    fen: raw.fen,
    solution: raw.solution,
    san,
    theme: raw.theme,
    difficulty: raw.difficulty,
    categoryId: category.id,
    categoryLabel: category.label,
    puzzleKey: `${category.id}|${raw.fen}|${raw.solution}`,
    previewLine:
      raw.winning_sequence
        ?.map((move) => move.san ?? move.uci)
        .filter((step): step is string => Boolean(step)) ?? [],
  };
}

function buildAnswerOptions(correctLabel: string) {
  const distractors = shuffleArray(
    CATEGORIES.map((category) => category.label).filter(
      (label) => label !== correctLabel,
    ),
  ).slice(0, 4);

  return shuffleArray([correctLabel, ...distractors]);
}

function timeLabelForRound(roundNumber: number) {
  return `${getRoundTime(roundNumber)} seconds`;
}

function sideToMoveLabel(fen: string) {
  return new Chess(fen).turn() === "w" ? "White" : "Black";
}

export default function SpeedTacticPage() {
  const [loading, setLoading] = useState(true);
  const [puzzlesLoaded, setPuzzlesLoaded] = useState(0);
  const [remainingPuzzles, setRemainingPuzzles] = useState(0);
  const [roundNumber, setRoundNumber] = useState(1);
  const [currentPuzzle, setCurrentPuzzle] = useState<Puzzle | null>(null);
  const [boardPosition, setBoardPosition] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const [locked, setLocked] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [message, setMessage] = useState("Choose your tactic, then beat the clock.");
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [answerFeedback, setAnswerFeedback] = useState<RoundOutcome | null>(null);
  const [sessionDone, setSessionDone] = useState(false);

  const basePoolsRef = useRef<PoolsByCategory>({});
  const activePoolsRef = useRef<PoolsByCategory>({});
  const autoAdvanceRef = useRef<number | null>(null);
  const roundNumberRef = useRef(1);
  const lockedRef = useRef(false);
  const currentPuzzleRef = useRef<Puzzle | null>(null);
  const loadIdRef = useRef(0);

  const selectedCategoryLabel = "All categories";

  const roundTime = useMemo(() => getRoundTime(roundNumber), [roundNumber]);

  const { theme } = useTheme();
  const boardTheme = getBoardTheme(theme);

  const answerOptions = useMemo(() => {
    if (!currentPuzzle) return [];
    return buildAnswerOptions(currentPuzzle.categoryLabel);
  }, [currentPuzzle]);

  const boardOrientation = useMemo(() => {
    if (!currentPuzzle) return "white" as const;
    return new Chess(currentPuzzle.fen).turn() === "w" ? "white" : "black";
  }, [currentPuzzle]);

  const clearAutoAdvance = () => {
    if (autoAdvanceRef.current !== null) {
      window.clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
  };

  const resetSessionState = () => {
    clearAutoAdvance();
    setCurrentPuzzle(null);
    currentPuzzleRef.current = null;
    setBoardPosition("");
    setRoundNumber(1);
    roundNumberRef.current = 1;
    setTimeLeft(getRoundTime(1));
    setLocked(false);
    lockedRef.current = false;
    setRevealed(false);
    setSelectedAnswer(null);
    setAnswerFeedback(null);
    setMessage("Choose your tactic, then beat the clock.");
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setSessionDone(false);
  };

  const replenishPools = () => {
    activePoolsRef.current = clonePools(basePoolsRef.current);
    setRemainingPuzzles(sumPools(activePoolsRef.current));
  };

  const drawNextPuzzle = (): Puzzle | null => {
    const activeTotal = sumPools(activePoolsRef.current);
    if (activeTotal === 0) {
      if (sumPools(basePoolsRef.current) === 0) return null;
      replenishPools();
    }

    const availableCategories = Object.entries(activePoolsRef.current).filter(([, list]) => list.length > 0);
    if (availableCategories.length === 0) return null;

    const [categoryId, list] = availableCategories[Math.floor(Math.random() * availableCategories.length)];
    const nextPuzzle = list[0] ?? null;
    if (!nextPuzzle) return null;

    activePoolsRef.current = {
      ...activePoolsRef.current,
      [categoryId]: list.slice(1),
    };
    setRemainingPuzzles(sumPools(activePoolsRef.current));
    return nextPuzzle;
  };

  const beginRound = (nextPuzzle: Puzzle, nextRoundNumber: number) => {
    clearAutoAdvance();

    roundNumberRef.current = nextRoundNumber;
    setRoundNumber(nextRoundNumber);
    setCurrentPuzzle(nextPuzzle);
    setBoardPosition(nextPuzzle.fen);
    currentPuzzleRef.current = nextPuzzle;
    setTimeLeft(getRoundTime(nextRoundNumber));
    setLocked(false);
    lockedRef.current = false;
    setRevealed(false);
    setSelectedAnswer(null);
    setAnswerFeedback(null);
    setSessionDone(false);
    setMessage(`Round ${nextRoundNumber}: choose the tactic before the clock runs out.`);
  };

  const startRound = (nextRoundNumber: number) => {
    const nextPuzzle = drawNextPuzzle();

    if (!nextPuzzle) {
      setCurrentPuzzle(null);
      currentPuzzleRef.current = null;
      setBoardPosition("");
      setSessionDone(true);
      setMessage("No puzzles available in the selected categories.");
      return;
    }

    beginRound(nextPuzzle, nextRoundNumber);
  };

  const loadSelectedCategories = async () => {
    const loadId = ++loadIdRef.current;
    const selectedIds = CATEGORIES.map((category) => category.id);

    if (selectedIds.length === 0) {
      resetSessionState();
      setLoading(false);
      setMessage("Choose at least one category.");
      return;
    }

    setLoading(true);
    resetSessionState();
    setMessage(`Loading ${selectedCategoryLabel}...`);

    try {
      const selectedCategories = CATEGORIES.filter((category) => selectedIds.includes(category.id));

      const loadedPairs = await Promise.all(
        selectedCategories.map(async (category) => {
          const res = await fetch(encodeURI(category.file), { cache: "no-store" });
          if (!res.ok) {
            throw new Error(`HTTP ${res.status} while loading ${category.file}`);
          }

          const raw = (await res.json()) as unknown;
          const rawList = Array.isArray(raw) ? raw : [];
          const unique = new Map<string, Puzzle>();

          for (const puzzle of rawList as RawPuzzle[]) {
            const normalized = normalizePuzzle(puzzle, category);
            if (!normalized) continue;
            if (!unique.has(normalized.puzzleKey)) {
              unique.set(normalized.puzzleKey, normalized);
            }
          }

          const capped = shuffleArray([...unique.values()]).slice(0, MAX_PER_CATEGORY);
          return [category.id, capped] as const;
        }),
      );

      if (loadId !== loadIdRef.current) return;

      const pools = Object.fromEntries(loadedPairs) as PoolsByCategory;
      basePoolsRef.current = clonePools(pools);
      activePoolsRef.current = clonePools(pools);

      const total = sumPools(activePoolsRef.current);
      setPuzzlesLoaded(total);
      setRemainingPuzzles(total);

      if (total === 0) {
        setLoading(false);
        setMessage(`No valid puzzles found in ${selectedCategoryLabel}.`);
        setCurrentPuzzle(null);
        currentPuzzleRef.current = null;
        setBoardPosition("");
        setSessionDone(true);
        return;
      }

      startRound(1);
      setLoading(false);
    } catch (error) {
      if (loadId !== loadIdRef.current) return;
      console.error(error);
      basePoolsRef.current = {};
      activePoolsRef.current = {};
      setPuzzlesLoaded(0);
      setRemainingPuzzles(0);
      setCurrentPuzzle(null);
      currentPuzzleRef.current = null;
      setBoardPosition("");
      setSessionDone(true);
      setMessage(`Could not load puzzles for ${selectedCategoryLabel}.`);
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSelectedCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    roundNumberRef.current = roundNumber;
  }, [roundNumber]);

  useEffect(() => {
    lockedRef.current = locked;
  }, [locked]);

  useEffect(() => {
    if (currentPuzzle) {
      setBoardPosition(currentPuzzle.fen);
    }
  }, [currentPuzzle]);

  useEffect(() => {
    return () => {
      clearAutoAdvance();
    };
  }, []);

  useEffect(() => {
    if (loading || locked || !currentPuzzle || sessionDone) return;
    if (timeLeft <= 0) return;

    const timer = window.setTimeout(() => {
      setTimeLeft((current) => current - 1);
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [currentPuzzle, locked, loading, sessionDone, timeLeft]);

  useEffect(() => {
    if (loading || !currentPuzzle || locked || sessionDone) return;
    if (timeLeft > 0) return;

    const outcome: RoundOutcome = {
      correct: false,
      choice: null,
      timedOut: true,
    };
    setLocked(true);
    lockedRef.current = true;
    setRevealed(true);
    setAnswerFeedback(outcome);
    setStreak(0);
    setSessionDone(true);
    setMessage(`Time's up — game over. Solution move: ${currentPuzzle.san || currentPuzzle.solution}.`);
  }, [currentPuzzle, locked, loading, sessionDone, timeLeft]);

  const finalizeRound = (outcome: RoundOutcome) => {
    if (!currentPuzzle || lockedRef.current) return;

    clearAutoAdvance();
    setLocked(true);
    lockedRef.current = true;
    setRevealed(true);
    setSelectedAnswer(outcome.choice);
    setAnswerFeedback(outcome);

    if (outcome.correct) {
      const timeBonus = Math.max(1, Math.ceil(timeLeft / 4));
      const roundBonus = Math.max(1, Math.ceil(roundNumber / 5));
      setScore((current) => current + 100 + timeBonus * 5 + roundBonus * 2);
      setStreak((current) => {
        const next = current + 1;
        setBestStreak((best) => Math.max(best, next));
        return next;
      });
      setMessage(`Correct — this is a ${currentPuzzle.categoryLabel}.`);

      autoAdvanceRef.current = window.setTimeout(() => {
        startRound(roundNumberRef.current + 1);
      }, AUTO_ADVANCE_DELAY_MS);
      return;
    }

    if (!outcome.timedOut) {
      const solutionMove = currentPuzzle.san || currentPuzzle.solution;
      setStreak(0);
      setSessionDone(true);
      setMessage(`Wrong — game over. Solution move: ${solutionMove}.`);
      return;
    }

    autoAdvanceRef.current = window.setTimeout(() => {
      startRound(roundNumberRef.current + 1);
    }, AUTO_ADVANCE_DELAY_MS);
  };

  const handleGuess = (choice: string) => {
    if (!currentPuzzle || lockedRef.current || sessionDone) return;

    const correct = choice === currentPuzzle.categoryLabel;
    if (correct) {
      finalizeRound({ correct: true, choice, timedOut: false });
      return;
    }

    finalizeRound({ correct: false, choice, timedOut: false });
  };

  const moveToNext = () => {
    if (!currentPuzzle || lockedRef.current || sessionDone) return;

    clearAutoAdvance();
    const solutionMove = currentPuzzle.san || currentPuzzle.solution;
    setLocked(true);
    lockedRef.current = true;
    setRevealed(true);
    setAnswerFeedback({ correct: false, choice: null, timedOut: false });
    setStreak(0);
    setSessionDone(true);
    setMessage(`Skipped — game over. Solution move: ${solutionMove}.`);
  };

  const currentTimeLabel = timeLabelForRound(roundNumber);
  const timerProgress = Math.max(0, Math.min(100, (timeLeft / roundTime) * 100));

  return (
    <main className="min-h-screen text-slate-100" style={{ background: getPageBackground(theme) }}>
      <div className="mx-auto max-w-7xl px-4 py-6 md:py-10">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900 px-3 py-1 text-sm text-slate-300">
              Speed Tactic
            </div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Guess the tactic before the timer ends
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400 md:text-base">
              Five choices per round. Category order stays balanced, and the clock gets faster every 10 turns.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                clearAutoAdvance();
                if (!currentPuzzle) return;
                setSessionDone(false);
                startRound(roundNumberRef.current);
              }}
              disabled={loading || !currentPuzzle}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-white disabled:opacity-50"
            >
              <Shuffle className="h-4 w-4" />
              New round
            </button>
            <button
              onClick={moveToNext}
              disabled={loading || !currentPuzzle}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800 disabled:opacity-50"
            >
              Forfeit
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => void loadSelectedCategories()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Reload
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)]">
          <section className="rounded-3xl border p-5 shadow-2xl shadow-black/20" style={{ borderColor: theme.background.border, background: getPanelBackground(theme) }}>
            <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="space-y-2">
                <div className="text-sm uppercase tracking-wide text-slate-400">Puzzles</div>
                <div className="text-xl font-semibold">All categories loaded</div>
                <div className="text-sm text-slate-500">
                  {puzzlesLoaded} puzzles loaded · {remainingPuzzles} left in the current cycle
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                  <div className="text-slate-500">Score</div>
                  <div className="mt-1 font-medium tabular-nums">{score}</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                  <div className="text-slate-500">Streak</div>
                  <div className="mt-1 font-medium tabular-nums">{streak}</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                  <div className="text-slate-500">Best streak</div>
                  <div className="mt-1 font-medium tabular-nums">{bestStreak}</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-3 py-2">
                  <div className="text-slate-500">Round</div>
                  <div className="mt-1 font-medium tabular-nums">{roundNumber}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
              <div className="rounded-3xl border p-3" style={{ borderColor: theme.background.border, background: getPanelBackground(theme) }}>
                {currentPuzzle ? (
                  <ChessBoard
  board={currentPuzzle ? new Chess(currentPuzzle.fen) : new Chess()}
  selectedSquare={null}
  legalTargets={[]}
  orientation={boardOrientation}
  onSquareClick={() => {}}
  showCoordinates={false}
/>

                ) : (
                  <div className="flex aspect-square items-center justify-center rounded-2xl border text-slate-400" style={{ borderColor: theme.background.border, background: getPanelBackground(theme) }}>
                    {loading ? "Loading puzzles..." : "No puzzle loaded"}
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border p-4" style={{ borderColor: theme.background.border, background: getPanelBackground(theme) }}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm uppercase tracking-wide text-slate-400">Timer</div>
                      <div className="mt-1 text-2xl font-semibold tabular-nums">{formatSeconds(timeLeft)}</div>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-900 text-slate-100">
                      <Clock3 className="h-5 w-5" />
                    </div>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-slate-100 transition-all"
                      style={{ width: `${timerProgress}%` }}
                    />
                  </div>
                  <div className="mt-2 text-xs text-slate-500">{currentTimeLabel} on this turn</div>
                </div>
                <div className="rounded-3xl border p-4" style={{ borderColor: theme.background.border, background: getPanelBackground(theme) }}>
                  <div className="text-sm uppercase tracking-wide text-slate-400">Round info</div>
                  <div className="mt-3 space-y-2 text-sm text-slate-300">
                    <div>
                      Side to move:{" "}
                      <span className="font-medium text-slate-100">{currentPuzzle ? sideToMoveLabel(currentPuzzle.fen) : "-"}</span>
                    </div>
                    <div>
                      Round status:{" "}
                      <span className="font-medium text-slate-100">
                        {sessionDone ? "Finished" : revealed ? "Solved or revealed" : "In progress"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border p-5 shadow-lg" style={{ borderColor: theme.background.border, background: getPanelBackground(theme) }}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm uppercase tracking-wide text-slate-400">Current round</div>
                  <div className="mt-1 text-xl font-semibold">Guess the tactic</div>
                </div>
                {(revealed || sessionDone) && currentPuzzle ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-sm text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" />
                    Revealed
                  </div>
                ) : null}
              </div>

              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
                {message}
              </div>
              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300">
                <div className="text-slate-500">Side to move</div>
                <div className="mt-1 font-medium text-slate-100">
                  {currentPuzzle ? sideToMoveLabel(currentPuzzle.fen) : "-"}
                </div>
              </div>

              <div className="mt-4 grid gap-2">
                {answerOptions.map((choice) => {
                  const isSelected = selectedAnswer === choice;
                  const isCorrect = revealed && currentPuzzle?.categoryLabel === choice;
                  const isWrong = revealed && isSelected && currentPuzzle?.categoryLabel !== choice;

                  return (
                    <button
                      key={choice}
                      onClick={() => handleGuess(choice)}
                      disabled={locked || !currentPuzzle || sessionDone}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-80 ${
                        isCorrect
                          ? "border-emerald-400 bg-emerald-500/15 text-emerald-200"
                          : isWrong
                            ? "border-rose-400 bg-rose-500/15 text-rose-200"
                            : isSelected
                              ? "border-slate-100 bg-slate-100 text-slate-950"
                              : "border-slate-800 bg-slate-950/60 text-slate-100 hover:bg-slate-800"
                      }`}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  onClick={moveToNext}
                  disabled={!currentPuzzle || loading}
                  className="flex-1 rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-white disabled:opacity-50"
                >
                  Forfeit
                </button>
              </div>
            </div>

            <div className="rounded-3xl border p-5 shadow-lg" style={{ borderColor: theme.background.border, background: getPanelBackground(theme) }}>
              <div className="flex items-center gap-2 text-sm uppercase tracking-wide text-slate-400">
                <Trophy className="h-4 w-4" />
                Progress
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-slate-500">Puzzles loaded</div>
                  <div className="mt-1 font-medium tabular-nums">{puzzlesLoaded || "-"}</div>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-3">
                  <div className="text-slate-500">Remaining</div>
                  <div className="mt-1 font-medium tabular-nums">{remainingPuzzles || "-"}</div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-300">
                {sessionDone && answerFeedback && !answerFeedback.correct && currentPuzzle ? (
                  currentPuzzle.previewLine.length ? (
                    <div className="space-y-2">
                      <div className="text-slate-500">Solution</div>
                      {currentPuzzle.previewLine.slice(0, 5).map((step, index) => (
                        <div
                          key={`${step}-${index}`}
                          className="rounded-xl border border-slate-800 bg-slate-950/70 px-3 py-2"
                        >
                          {index + 1}. {step}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-slate-500">No solution line available.</div>
                  )
                ) : (
                  <div className="text-slate-500">Solution hidden until you lose.</div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
