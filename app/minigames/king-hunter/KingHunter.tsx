"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Chess, type Square } from "chess.js";
import { ArrowLeft, RotateCcw } from "lucide-react";

import ChessBoard from "../../components/ChessBoard";
import HUD from "./HUD";
import KingHunterIcon from "./KingHunterIcon";
import { buildKingHunterSession, getTierLabel } from "./PuzzleManager";
import { formatMovesRemaining } from "./utils";
import { getBestMove, parseUciMove } from "./StockfishEngine";
import type { DeckMap, GameStatus, Tier } from "./types";
import { useTheme } from "@/components/ThemeProvider";
import {
  getPageBackground,
  getPanelBackground,
} from "@/lib/backgrounds";

const TIERS: Tier[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 25];

function formatThemeLabel(value: string) {
  return value
    .split("_")
    .map((word) => {
      if (!word) return word;
      if (word.toLowerCase() === "in") return "in";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export default function KingHunter() {
  const { theme } = useTheme();
  const pageBackground = getPageBackground(theme);
  const panelBackground = getPanelBackground(theme);

  const shellText = theme.id === "girly" ? "text-slate-900" : "text-slate-100";
  const mutedText = theme.id === "girly" ? "text-slate-700" : "text-stone-300";
  const accentText = theme.background.accent;
  const borderColor = theme.background.border;

  const [decks, setDecks] = useState<DeckMap>(() => buildKingHunterSession());
  const [tierIndex, setTierIndex] = useState(0);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [board, setBoard] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [movesRemaining, setMovesRemaining] = useState(1);
  const [status, setStatus] = useState<GameStatus>("idle");
  const [message, setMessage] = useState("Press Start to begin.");
  const [engineBusy, setEngineBusy] = useState(false);

  const currentTier = TIERS[Math.min(tierIndex, TIERS.length - 1)];
  const currentTierDeck = decks[currentTier] ?? [];
  const currentPuzzle = currentTierDeck[puzzleIndex] ?? null;
  const puzzleCount = currentTierDeck.length;

  const tierLabel = currentPuzzle?.theme
    ? formatThemeLabel(currentPuzzle.theme)
    : getTierLabel(currentTier);

  const boardOrientation: "white" | "black" =
    currentPuzzle?.side_to_move === "white" ? "white" : "black";

  const legalTargets = useMemo(() => {
    if (!selectedSquare) return [];
    return board
      .moves({ square: selectedSquare, verbose: true })
      .map((move) => move.to as Square);
  }, [board, selectedSquare]);

  function loadPuzzle(nextDecks: DeckMap, nextTierIndex: number, nextPuzzleIndex: number) {
    const nextTier = TIERS[Math.min(nextTierIndex, TIERS.length - 1)];
    const nextTierDeck = nextDecks[nextTier] ?? [];
    const nextPuzzle = nextTierDeck[nextPuzzleIndex];

    if (!nextPuzzle) {
      setStatus("won");
      setMessage("King Hunter cleared.");
      return;
    }

    const nextBoard = new Chess(nextPuzzle.fen);

    setBoard(nextBoard);
    setSelectedSquare(null);
    setMovesRemaining(nextPuzzle.mate_length);
    setStatus("playing");
    setMessage(
      `Tier ${getTierLabel(nextTier)} loaded. Puzzle ${nextPuzzleIndex + 1}/${nextTierDeck.length}.`,
    );
    setEngineBusy(false);
  }

  function startGame() {
    const nextDecks = buildKingHunterSession();
    setDecks(nextDecks);
    setTierIndex(0);
    setPuzzleIndex(0);
    loadPuzzle(nextDecks, 0, 0);
  }

  function resetGame() {
    const nextDecks = buildKingHunterSession();
    setDecks(nextDecks);
    setTierIndex(0);
    setPuzzleIndex(0);
    setBoard(new Chess());
    setSelectedSquare(null);
    setMovesRemaining(1);
    setStatus("idle");
    setMessage("Press Start to begin.");
    setEngineBusy(false);
  }

  function advanceToNextPuzzle() {
    const nextPuzzleIndex = puzzleIndex + 1;
    const tierDeck = decks[currentTier] ?? [];

    if (nextPuzzleIndex < tierDeck.length) {
      setPuzzleIndex(nextPuzzleIndex);
      loadPuzzle(decks, tierIndex, nextPuzzleIndex);
      return;
    }

    const nextTierIndex = tierIndex + 1;
    if (nextTierIndex >= TIERS.length) {
      setStatus("won");
      setMessage("King Hunter cleared.");
      return;
    }

    setTierIndex(nextTierIndex);
    setPuzzleIndex(0);
    loadPuzzle(decks, nextTierIndex, 0);
  }

  async function playEngineReply(positionAfterUserMove: Chess): Promise<boolean> {
    const replyBoard = new Chess(positionAfterUserMove.fen());
    const legalReplies = replyBoard.moves({ verbose: true });

    if (legalReplies.length === 0) {
      if (replyBoard.isCheckmate()) {
        setStatus("won");
        setMessage("Mate found.");
      } else {
        setStatus("lost");
        setMessage("No legal replies remain.");
      }
      return false;
    }

    const result = await getBestMove(positionAfterUserMove.fen());
    const engineUci = result.bestMove;
    const parsed = engineUci ? parseUciMove(engineUci) : null;
    const fallback = legalReplies[0];

    const played = replyBoard.move({
      from: (parsed?.from ?? fallback.from) as Square,
      to: (parsed?.to ?? fallback.to) as Square,
      promotion:
        parsed?.promotion ??
        (fallback.promotion as "q" | "r" | "b" | "n" | undefined),
    });

    if (!played) {
      const fallbackPlayed = replyBoard.move({
        from: fallback.from as Square,
        to: fallback.to as Square,
        promotion: fallback.promotion as "q" | "r" | "b" | "n" | undefined,
      });

      if (!fallbackPlayed) {
        setStatus("lost");
        setMessage("Reply move could not be played.");
        return false;
      }
    }

    setBoard(replyBoard);

    if (replyBoard.isCheckmate()) {
      setStatus("lost");
      setMessage("The king escaped your net.");
      return false;
    }

    if (replyBoard.isDraw() || replyBoard.isStalemate()) {
      setStatus("lost");
      setMessage("The position dried up.");
      return false;
    }

    return true;
  }

  async function handleUserMove(targetSquare: Square) {
    if (status !== "playing" || engineBusy || !currentPuzzle) return;
    if (board.turn() !== currentPuzzle.side_to_move[0]) return;
    if (!selectedSquare) return;

    const nextBoard = new Chess(board.fen());
    const move = nextBoard.move({
      from: selectedSquare,
      to: targetSquare,
      promotion: "q",
    });

    if (!move) {
      setSelectedSquare(null);
      return;
    }

    setBoard(nextBoard);
    setSelectedSquare(null);

    const nextRemaining = movesRemaining - 1;

    if (nextBoard.isCheckmate()) {
      setMovesRemaining(nextRemaining);
      setStatus("won");
      setMessage("Mate found.");
      window.setTimeout(() => advanceToNextPuzzle(), 650);
      return;
    }

    if (nextRemaining <= 0) {
      setMovesRemaining(0);
      setStatus("lost");
      setMessage("No moves remaining.");
      return;
    }

    setMovesRemaining(nextRemaining);
    setEngineBusy(true);
    setMessage("Stockfish is checking the reply...");

    try {
      const enginePlayed = await playEngineReply(nextBoard);
      if (!enginePlayed) return;
      setMessage(formatMovesRemaining(nextRemaining));
    } finally {
      setEngineBusy(false);
    }
  }

  function handleSquareClick(square: Square) {
    if (status !== "playing" || engineBusy || !currentPuzzle) return;

    const piece = board.get(square);

    if (selectedSquare) {
      if (selectedSquare === square) {
        setSelectedSquare(null);
        return;
      }

      if (piece && piece.color === board.turn()) {
        setSelectedSquare(square);
        return;
      }

      void handleUserMove(square);
      return;
    }

    if (piece && piece.color === board.turn()) {
      setSelectedSquare(square);
    }
  }

  const tierProgressLabel = getTierLabel(currentTier);
  const sideLabel =
    currentPuzzle?.side_to_move === "white" ? "White to move" : "Black to move";

  return (
    <main
      className={`min-h-screen ${shellText}`}
      style={{ background: pageBackground }}
    >
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition"
            style={{
              borderColor: borderColor,
              background: panelBackground,
              color: theme.id === "girly" ? "#831843" : "#f5d7a1",
            }}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Chessactic
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetGame}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition"
              style={{
                borderColor,
                background: panelBackground,
                color: theme.id === "girly" ? "#831843" : accentText,
              }}
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>

            <button
              type="button"
              onClick={startGame}
              className="inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-[0_10px_24px_rgba(215,171,50,0.25)] transition hover:brightness-110"
              style={{
                borderColor: theme.background.accent,
                background:
                  theme.id === "girly"
                    ? "linear-gradient(135deg, #fce7f3 0%, #f9a8d4 100%)"
                    : "linear-gradient(135deg, #f3d59f 0%, #d7ab32 55%, #a56f1d 100%)",
                color: theme.id === "girly" ? "#831843" : "#1a1207",
              }}
            >
              <KingHunterIcon className="h-4 w-4" />
              Start
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
          <section
            className="rounded-[2rem] border p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
            style={{
              borderColor,
              background: panelBackground,
              boxShadow:
                theme.id === "girly"
                  ? "0 24px 80px rgba(236,72,153,0.08)"
                  : "0 24px 80px rgba(0,0,0,0.45)",
            }}
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div
                  className="text-sm uppercase tracking-[0.24em]"
                  style={{ color: theme.background.accent }}
                >
                  Mini Game
                </div>
                <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold">
                  <KingHunterIcon className="h-8 w-8" />
                  King Hunter
                </h1>
                <p className={`mt-2 max-w-2xl text-sm leading-6 ${mutedText}`}>
                  Solve three puzzles in each tier from mate in 1 through mate in 10, then
                  finish the final boss mate in 25.
                </p>
              </div>

              <div
                className="rounded-[1.5rem] border px-4 py-3 text-right"
                style={{ borderColor, background: theme.id === "girly" ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.3)" }}
              >
                <div
                  className="text-[11px] uppercase tracking-[0.28em]"
                  style={{ color: theme.id === "girly" ? "#9f1239" : "rgba(252,211,77,0.55)" }}
                >
                  Remaining strikes
                </div>
                <div className="mt-1 text-3xl font-semibold" style={{ color: theme.id === "girly" ? "#831843" : "#f8fafc" }}>
                  {movesRemaining}
                </div>
              </div>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              {[
                {
                  label: "Tier",
                  value: tierProgressLabel,
                },
                {
                  label: "Puzzle",
                  value: `${puzzleIndex + 1} / ${puzzleCount}`,
                },
                {
                  label: "Status",
                  value:
                    status === "won"
                      ? "Cleared"
                      : status === "lost"
                        ? "Game over"
                        : status === "playing"
                          ? "Live"
                          : "Idle",
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-[1.35rem] border bg-black/25 p-4"
                  style={{ borderColor }}
                >
                  <div
                    className="text-[11px] uppercase tracking-[0.28em]"
                    style={{ color: theme.id === "girly" ? "#9f1239" : "rgba(252,211,77,0.55)" }}
                  >
                    {card.label}
                  </div>
                  <div className="mt-2 text-xl font-semibold" style={{ color: theme.id === "girly" ? "#831843" : "#f8fafc" }}>
                    {card.value}
                  </div>
                </div>
              ))}
            </div>

            <div
              className="mb-4 rounded-[1.35rem] border p-4 text-sm"
              style={{ borderColor, background: theme.id === "girly" ? "rgba(255,255,255,0.65)" : "rgba(0,0,0,0.25)", color: theme.id === "girly" ? "#4c1d95" : "#e7e5e4" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>{message}</span>
                <span
                  className="rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em]"
                  style={{
                    borderColor,
                    background:
                      theme.id === "girly"
                        ? "linear-gradient(135deg, rgba(255,255,255,0.8), rgba(255,228,241,0.9))"
                        : "linear-gradient(135deg, #22160f, #0b0908)",
                    color: theme.id === "girly" ? "#831843" : "rgba(254,240,138,0.85)",
                  }}
                >
                  {sideLabel}
                </span>
              </div>
            </div>

            <div className="mx-auto w-full max-w-[640px]">
              <ChessBoard
                board={board}
                selectedSquare={selectedSquare}
                legalTargets={legalTargets}
                orientation={boardOrientation}
                onSquareClick={handleSquareClick}
              />
            </div>
          </section>

          <aside className="space-y-6">
            <HUD
              tierLabel={tierLabel}
              puzzleNumber={puzzleIndex + 1}
              puzzleCount={puzzleCount}
              movesRemaining={movesRemaining}
              status={status}
              message={message}
              sideToMove={currentPuzzle?.side_to_move ?? "white"}
              engineBusy={engineBusy}
            />

            <section
              className="rounded-[2rem] border p-5 shadow-[0_24px_80px_rgba(0,0,0,0.4)]"
              style={{
                borderColor,
                background: panelBackground,
              }}
            >
              <div className="text-sm uppercase tracking-[0.24em]" style={{ color: theme.background.accent }}>
                Notes
              </div>
              <div className={`mt-3 space-y-3 text-sm leading-6 ${mutedText}`}>
                <p>
                  Tiers 1-5 are randomized from your uploaded JSON files each time you start.
                </p>
                <p>
                  Tiers 6-10 and the boss are wired from the FENs you provided.
                </p>
                <p>
                  Promotions default to queens.
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
