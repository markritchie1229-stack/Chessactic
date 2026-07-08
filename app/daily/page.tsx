"use client";

import { useEffect, useMemo, useState } from "react";
import { Chess } from "chess.js";
import ChessBoard from "../components/ChessBoard";
import {
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Lock,
} from "lucide-react";
import { DailyArchiveButton } from "../components/DailyArchiveButton";
import { supabase } from "@/lib/supabase";

type GameMeta = {
  label?: string;
  pgn_file: string;
  white_elo?: string;
  black_elo?: string;
};

type DailyResultRow = {
  date_key: string;
  label?: string | null;
  white_guess: number;
  black_guess: number;
  white_error: number;
  black_error: number;
  max_error: number;
  solved: boolean;
};

const TABLE_NAME = "daily_guess_the_elo_results";

/**
 * Change this if your first daily puzzle should start on a different UTC day.
 * The first JSONL row is shown on this date, the second row the next UTC day, etc.
 */
const START_DATE_UTC = new Date("2026-07-08T00:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function utcDayKey(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
    2,
    "0",
  )}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function utcDayIndex(length: number) {
  if (length <= 0) return 0;

  const now = new Date();
  const todayUtcMidnightMs = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  const startUtcMidnightMs = Date.UTC(
    START_DATE_UTC.getUTCFullYear(),
    START_DATE_UTC.getUTCMonth(),
    START_DATE_UTC.getUTCDate(),
  );

  const dayOffset = Math.floor((todayUtcMidnightMs - startUtcMidnightMs) / DAY_MS);
  if (dayOffset < 0) return 0;

  return dayOffset % length;
}

function parseJsonlGames(text: string): GameMeta[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line) as GameMeta;
      } catch {
        throw new Error(`Invalid JSONL on line ${index + 1}`);
      }
    });
}

export default function DailyPage() {
  const [games, setGames] = useState<GameMeta[]>([]);
  const [loading, setLoading] = useState(true);

  const [pgnText, setPgnText] = useState("");
  const [moves, setMoves] = useState<string[]>([]);
  const [moveIndex, setMoveIndex] = useState(0);

  const [whiteGuess, setWhiteGuess] = useState("");
  const [blackGuess, setBlackGuess] = useState("");
  const [feedback, setFeedback] = useState("Enter both ratings and submit.");
  const [submittedToday, setSubmittedToday] = useState(false);

  const todayKey = utcDayKey();

  const currentGame = useMemo(() => {
    if (!games.length) return null;
    return games[utcDayIndex(games.length)] ?? null;
  }, [games]);

  useEffect(() => {
    void (async () => {
      try {
        const paths = [
          "/guess_the_elo_output/games.jsonl",
          "/guess_the_elo_output/games.json",
        ];

        let text = "";

        for (const path of paths) {
          const res = await fetch(path);
          if (res.ok) {
            text = await res.text();
            break;
          }
        }

        if (!text) {
          throw new Error(`Could not find games file. Tried: ${paths.join(", ")}`);
        }

        setGames(parseJsonlGames(text));
      } catch (err) {
        console.error(err);
        setGames([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    void (async () => {
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (userError) {
        console.error(userError);
        return;
      }

      const user = userData.user;
      if (!user) {
        setFeedback("Please sign in to submit today’s guess.");
        return;
      }

      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("date_key, white_guess, black_guess, white_error, black_error, max_error, solved")
        .eq("user_id", user.id)
        .eq("date_key", todayKey)
        .maybeSingle<DailyResultRow>();

      if (error) {
        console.error(error);
        return;
      }

      if (data) {
        setSubmittedToday(true);
        setWhiteGuess(String(data.white_guess));
        setBlackGuess(String(data.black_guess));
        setFeedback("Your guess has already been submitted today.");
      }
    })();
  }, [todayKey]);

  useEffect(() => {
    if (!currentGame?.pgn_file) return;

    void (async () => {
      try {
        const pgnPath = currentGame.pgn_file.startsWith("/")
          ? currentGame.pgn_file
          : `/${currentGame.pgn_file}`;

        const res = await fetch(pgnPath);
        if (!res.ok) throw new Error(`Failed to load PGN (${res.status})`);

        const text = await res.text();
        setPgnText(text);

        const game = new Chess();
        game.loadPgn(text);

        setMoves(game.history());
        setMoveIndex(0);
      } catch (err) {
        console.error(err);
        setPgnText("");
        setMoves([]);
        setMoveIndex(0);
      }
    })();
  }, [currentGame]);

  const board = useMemo(() => {
    const game = new Chess();
    for (const move of moves.slice(0, moveIndex)) {
      game.move(move);
    }
    return game;
  }, [moves, moveIndex]);

  const maxMoveIndex = moves.length;

  const submitGuess = async () => {
    if (!currentGame) return;

    if (submittedToday) {
      setFeedback("Your guess has already been submitted today.");
      return;
    }

    const white = Number(whiteGuess);
    const black = Number(blackGuess);

    if (!Number.isFinite(white) || !Number.isFinite(black)) {
      setFeedback("Please enter both ratings.");
      return;
    }

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error(userError);
      setFeedback("Please sign in to submit today’s guess.");
      return;
    }

    const user = userData.user;
    if (!user) {
      setFeedback("Please sign in to submit today’s guess.");
      return;
    }

    const whiteElo = Number(currentGame.white_elo);
    const blackElo = Number(currentGame.black_elo);

    if (!Number.isFinite(whiteElo) || !Number.isFinite(blackElo)) {
      setFeedback("The current game metadata is missing Elo values.");
      return;
    }

    const whiteError = Math.abs(white - whiteElo);
    const blackError = Math.abs(black - blackElo);
    const maxError = Math.max(whiteError, blackError);
    const isSolved = whiteError <= 100 && blackError <= 100;

    const { error } = await supabase.from(TABLE_NAME).insert({
      user_id: user.id,
      date_key: todayKey,
      label: currentGame.label ?? null,
      white_guess: white,
      black_guess: black,
      white_error: whiteError,
      black_error: blackError,
      max_error: maxError,
      solved: isSolved,
    });

    if (error) {
      if (error.code === "23505") {
        setSubmittedToday(true);
        setFeedback("Your guess has already been submitted today.");
        return;
      }

      console.error(error);
      setFeedback("Could not save your guess.");
      return;
    }

    setSubmittedToday(true);
    setFeedback("Your guess has already been submitted today.");
  };

  const clearGuesses = () => {
    if (submittedToday) return;
    setWhiteGuess("");
    setBlackGuess("");
    setFeedback("Enter both ratings and submit.");
  };

  const archiveStatusText = submittedToday
    ? "Your guess has already been submitted today."
    : "No submission yet today.";

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              Daily Guess the Elo
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              One hidden game per day at 00:00 UTC.
            </p>
          </div>
          <DailyArchiveButton />
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_360px]">
          <section className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4 shadow-2xl shadow-black/20 md:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-sm text-slate-400">
                {loading ? "Loading today's game..." : `Today: ${todayKey}`}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setMoveIndex((v) => Math.max(0, v - 1))}
                  disabled={moveIndex <= 0}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 disabled:opacity-40"
                  aria-label="Previous move"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setMoveIndex((v) => Math.min(maxMoveIndex, v + 1))}
                  disabled={moveIndex >= maxMoveIndex}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 disabled:opacity-40"
                  aria-label="Next move"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setMoveIndex(0)}
                  className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100"
                  aria-label="Reset board"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950">
              {currentGame ? (
                <ChessBoard
                  key={todayKey}
                  board={board}
                  selectedSquare={null}
                  legalTargets={[]}
                  orientation="white"
                  onSquareClick={() => {}}
                />
              ) : (
                <div className="flex aspect-square items-center justify-center p-8 text-slate-400">
                  {loading ? "Loading..." : "No game loaded"}
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm text-slate-400">
              <span>
                Move {moveIndex} of {maxMoveIndex}
              </span>
              <span>{pgnText ? "PGN loaded" : "PGN not loaded"}</span>
            </div>

            <div className="mt-4 grid gap-2">
              <input
                type="range"
                min={0}
                max={maxMoveIndex}
                value={moveIndex}
                onChange={(e) => setMoveIndex(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="text-sm uppercase tracking-wide text-slate-400">
                Guess the ratings
              </div>

              <div className="mt-4 space-y-3">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="White's ELO"
                  value={whiteGuess}
                  onChange={(e) => setWhiteGuess(e.target.value)}
                  disabled={submittedToday}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 disabled:opacity-50"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Black's ELO"
                  value={blackGuess}
                  onChange={(e) => setBlackGuess(e.target.value)}
                  disabled={submittedToday}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 disabled:opacity-50"
                />
                <button
                  onClick={submitGuess}
                  disabled={submittedToday}
                  className="w-full rounded-2xl bg-emerald-500 px-4 py-3 font-semibold text-slate-950 transition hover:bg-emerald-400 disabled:opacity-50"
                >
                  Submit
                </button>
                <button
                  onClick={clearGuesses}
                  disabled={submittedToday}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 font-medium text-slate-100 disabled:opacity-50"
                >
                  Clear
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
                {feedback}
              </div>

              {submittedToday ? (
                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-500/15 px-3 py-1 text-sm text-slate-300">
                  <Lock className="h-4 w-4" />
                  Submitted today
                </div>
              ) : null}

              <div className="mt-4 text-sm text-slate-400">{archiveStatusText}</div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="text-sm uppercase tracking-wide text-slate-400">
                Daily rules
              </div>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                The page shows only the board and the two guess fields. A submission is locked after one attempt each UTC day.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}