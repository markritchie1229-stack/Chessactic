"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Chess, type Square } from "chess.js";
import { ArrowLeft, RotateCcw } from "lucide-react";

import ChessBoard from "./ChessBoard";
import HUD from "./HUD";
import KingHunterIcon from "./KingHunterIcon";
import { buildKingHunterSession, getTierLabel } from "./PuzzleManager";
import { formatMovesRemaining, normalizeUci } from "./utils";
import {
  analyzePosition,
  getBestMove,
  parseUciMove,
  preservesForcedMate,
} from "./StockfishEngine";
import type { DeckMap, GameStatus, Tier } from "./types";

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
  const [decks, setDecks] = useState<DeckMap>(() => buildKingHunterSession());
  const [tierIndex, setTierIndex] = useState(0);
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const [board, setBoard] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [movesRemaining, setMovesRemaining] = useState(1);
  const [status, setStatus] = useState<GameStatus>("idle");
  const [message, setMessage] = useState("Press Start to begin.");
  const [engineBusy, setEngineBusy] = useState(false);
  const [plyIndex, setPlyIndex] = useState(0);

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
    setPlyIndex(0);
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
    setPlyIndex(0);
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

  async function playEngineReply(
    positionAfterUserMove: Chess,
    nextPlyIndex: number,
    nextRemaining: number,
  ) {
    if (!currentPuzzle) return;

    try {
      const expectedUci = currentPuzzle.sample_line?.[nextPlyIndex];
      let engineUci: string | null = expectedUci ?? null;

      if (!engineUci) {
        const result = await getBestMove(positionAfterUserMove.fen());
        engineUci = result.bestMove;
      }

      if (!engineUci) {
        const legal = positionAfterUserMove.moves({ verbose: true }) as Array<{
          from: Square;
          to: Square;
          promotion?: "q" | "r" | "b" | "n";
        }>;

        const fallback = legal[0];
        if (!fallback) {
          setStatus("lost");
          setMessage("No legal engine reply.");
          return;
        }

        engineUci = `${fallback.from}${fallback.to}${fallback.promotion ?? ""}`;
      }

      const parsed = parseUciMove(engineUci);
      if (!parsed) {
        setStatus("lost");
        setMessage("Engine produced an invalid move.");
        return;
      }

      const replyBoard = new Chess(positionAfterUserMove.fen());
      const result = replyBoard.move({
        from: parsed.from as Square,
        to: parsed.to as Square,
        promotion: parsed.promotion,
      });

      if (!result) {
        setStatus("lost");
        setMessage("Engine move could not be played.");
        return;
      }

      setBoard(replyBoard);
      setPlyIndex(nextPlyIndex + 1);

      if (replyBoard.isCheckmate()) {
        setStatus("lost");
        setMessage("The king escaped your net.");
        return;
      }

      if (replyBoard.isDraw() || replyBoard.isStalemate()) {
        setStatus("lost");
        setMessage("The position dried up.");
        return;
      }

      setMessage(formatMovesRemaining(nextRemaining));
    } finally {
      setEngineBusy(false);
    }
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

    const playedUci = normalizeUci(`${move.from}${move.to}${move.promotion ?? ""}`);
    const expectedUci = normalizeUci(currentPuzzle.sample_line?.[plyIndex] ?? "");

    if (expectedUci && playedUci !== expectedUci && !nextBoard.isCheckmate()) {
      setBoard(nextBoard);
      setSelectedSquare(null);
      setStatus("lost");
      setMessage("Wrong move. The king escapes.");
      return;
    }

    setBoard(nextBoard);
    setSelectedSquare(null);

    const nextRemaining = movesRemaining - 1;
    setMovesRemaining(nextRemaining);
    setPlyIndex((value) => value + 1);

    if (nextBoard.isCheckmate()) {
      setStatus("won");
      setMessage("Mate found.");
      window.setTimeout(() => advanceToNextPuzzle(), 650);
      return;
    }

    if (nextRemaining <= 0) {
      setStatus("lost");
      setMessage("No moves remaining.");
      return;
    }

    setEngineBusy(true);
    setMessage("Stockfish is checking the line...");

    let analysis;
    try {
      analysis = await analyzePosition(nextBoard.fen());
    } catch {
      setEngineBusy(false);
      setStatus("lost");
      setMessage("Stockfish could not verify the line.");
      return;
    }

    if (!preservesForcedMate(analysis, nextRemaining)) {
      setEngineBusy(false);
      setStatus("lost");
      setMessage("Stockfish says the mate is gone.");
      return;
    }

    setMessage("Stockfish is choosing...");
    await playEngineReply(nextBoard, plyIndex + 1, nextRemaining);
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
  const sideLabel = currentPuzzle?.side_to_move === "white" ? "White to move" : "Black to move";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,204,112,0.08),_transparent_30%),linear-gradient(180deg,#090807_0%,#050404_100%)] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#d7ab32]/15 bg-black/20 px-4 py-2 text-sm text-amber-100/70 transition hover:border-[#d7ab32]/35 hover:text-amber-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Chessactic
          </Link>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={resetGame}
              className="inline-flex items-center gap-2 rounded-full border border-[#d7ab32]/20 bg-gradient-to-br from-[#201915] to-[#0d0a09] px-4 py-2 text-sm text-amber-100 transition hover:border-[#d7ab32]/40 hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>

            <button
              type="button"
              onClick={startGame}
              className="inline-flex items-center gap-2 rounded-full border border-[#f6d38a]/30 bg-gradient-to-br from-[#f3d59f] via-[#d7ab32] to-[#a56f1d] px-4 py-2 text-sm font-medium text-[#1a1207] shadow-[0_10px_24px_rgba(215,171,50,0.25)] transition hover:brightness-110"
            >
              <KingHunterIcon className="h-4 w-4" />
              Start
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.08fr)_minmax(320px,0.92fr)]">
          <section className="rounded-[2rem] border border-[#9b7b40]/25 bg-gradient-to-br from-[#1a1512] via-[#100d0b] to-[#080706] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-sm uppercase tracking-[0.24em] text-amber-200/50">
                  Mini Game
                </div>
                <h1 className="mt-2 flex items-center gap-3 text-3xl font-bold text-amber-50">
                  <KingHunterIcon className="h-8 w-8" />
                  King Hunter
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
                  Solve three puzzles in each tier from mate in 1 through mate in 10, then
                  finish the final boss mate in 25.
                </p>
              </div>

              <div className="rounded-[1.5rem] border border-[#d7ab32]/20 bg-black/30 px-4 py-3 text-right">
                <div className="text-[11px] uppercase tracking-[0.28em] text-amber-200/55">
                  Remaining strikes
                </div>
                <div className="mt-1 text-3xl font-semibold text-amber-50">
                  {movesRemaining}
                </div>
              </div>
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.35rem] border border-[#d7ab32]/20 bg-black/25 p-4">
                <div className="text-[11px] uppercase tracking-[0.28em] text-amber-200/55">
                  Tier
                </div>
                <div className="mt-2 text-xl font-semibold text-amber-50">
                  {tierProgressLabel}
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-[#d7ab32]/20 bg-black/25 p-4">
                <div className="text-[11px] uppercase tracking-[0.28em] text-amber-200/55">
                  Puzzle
                </div>
                <div className="mt-2 text-xl font-semibold text-amber-50">
                  {puzzleIndex + 1} / {puzzleCount}
                </div>
              </div>

              <div className="rounded-[1.35rem] border border-[#d7ab32]/20 bg-black/25 p-4">
                <div className="text-[11px] uppercase tracking-[0.28em] text-amber-200/55">
                  Status
                </div>
                <div className="mt-2 text-xl font-semibold text-amber-50">
                  {status === "won"
                    ? "Cleared"
                    : status === "lost"
                      ? "Game over"
                      : status === "playing"
                        ? "Live"
                        : "Idle"}
                </div>
              </div>
            </div>

            <div className="mb-4 rounded-[1.35rem] border border-[#d7ab32]/20 bg-black/25 p-4 text-sm text-stone-200">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span>{message}</span>
                <span className="rounded-full border border-[#d7ab32]/20 bg-gradient-to-br from-[#22160f] to-[#0b0908] px-3 py-1 text-xs uppercase tracking-[0.18em] text-amber-100/80">
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
              tierLabel={currentPuzzle?.theme ? formatThemeLabel(currentPuzzle.theme) : getTierLabel(currentTier)}
              puzzleNumber={puzzleIndex + 1}
              puzzleCount={puzzleCount}
              movesRemaining={movesRemaining}
              status={status}
              message={message}
              sideToMove={currentPuzzle?.side_to_move ?? "white"}
              engineBusy={engineBusy}
            />

            <section className="rounded-[2rem] border border-[#9b7b40]/25 bg-gradient-to-br from-[#15110f] via-[#0f0c0a] to-[#070605] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.4)]">
              <div className="text-sm uppercase tracking-[0.24em] text-amber-200/50">
                Notes
              </div>
              <div className="mt-3 space-y-3 text-sm leading-6 text-stone-300">
                <p>
                  Tiers 1-5 are randomized from your uploaded JSON files each time you
                  start.
                </p>
                <p>
                  Tiers 6-10 and the boss are wired from the FENs you provided. Their exact
                  solution lines can be added later if you want strict forced-line validation
                  there too.
                </p>
                <p>Promotions default to queens.</p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
