import mate1Raw from "@/components/data/king-hunter/Mate.In.1.Complete.Rated_deduped.json";
import mate2Raw from "@/components/data/king-hunter/Mate.In.2.Complete.Rated_deduped.json";
import mate3Raw from "@/components/data/king-hunter/Mate.In.3.Complete.Rated_deduped.json";
import mate4Raw from "@/components/data/king-hunter/synthetic_mate_in_4.json";
import mate5Raw from "@/components/data/king-hunter/synthetic_mate_in_5.json";

import { drawTier } from "./utils";
import type { DeckMap, Puzzle, SideToMove, Tier } from "./types";
import { TIER_LABELS } from "./types";

type JsonPuzzle = {
  fen: string;
  solution?: string;
  sample_line?: string[];
  sampleLine?: string[];
  mate_length?: number;
  side_to_move?: "white" | "black";
  sideToMove?: SideToMove | "w" | "b";
  theme?: string;
};

type JsonSideToMove = JsonPuzzle["side_to_move"] | JsonPuzzle["sideToMove"] | undefined;

function normalizeSideToMove(value: JsonSideToMove): SideToMove {
  if (value === "black" || value === "b") return "black";
  return "white";
}

function normalizeJsonPuzzle(
  tier: Exclude<Tier, 6 | 7 | 8 | 9 | 10 | 25>,
  index: number,
  puzzle: JsonPuzzle,
): Puzzle {
  return {
    fen: puzzle.fen,
    solution: puzzle.solution,
    sample_line: puzzle.sample_line ?? puzzle.sampleLine,
    mate_length: puzzle.mate_length ?? tier,
    side_to_move: normalizeSideToMove(puzzle.side_to_move ?? puzzle.sideToMove),
    theme: puzzle.theme,
  };
}

function makePuzzle(
  fen: string,
  sideToMove: SideToMove,
  mateLength: number,
  theme: string,
): Puzzle {
  return {
    fen,
    solution: "",
    sample_line: [],
    mate_length: mateLength,
    side_to_move: sideToMove,
    theme,
  };
}

const tier6: Puzzle[] = [
  makePuzzle(
    "4r2k/pb1p1Bpp/1pnP4/8/5Q2/8/PPP2PPP/2K4R w - - 0 1",
    "white",
    6,
    "mate_in_6",
  ),
  makePuzzle(
    "8/8/6N1/1p1k1p2/2b4P/5qB1/2K5/8 b - - 0 1",
    "black",
    6,
    "mate_in_6",
  ),
  makePuzzle(
    "3Q4/2K5/8/8/P1B2k2/1P6/8/8 w - - 0 1",
    "white",
    6,
    "mate_in_6",
  ),
];

const tier7: Puzzle[] = [
  makePuzzle(
    "8/1p3qk1/3Q4/1p1P2p1/4P1R1/P7/1PP3PP/6K1 w - - 0 1",
    "white",
    7,
    "mate_in_7",
  ),
  makePuzzle(
    "8/8/3Pk3/3q4/5Kp1/8/2R5/6r1 b - - 3 3",
    "black",
    7,
    "mate_in_7",
  ),
  makePuzzle(
    "8/4r1k1/8/5p2/7P/3Q4/3Kp3/4R3 w - - 0 2",
    "white",
    7,
    "mate_in_7",
  ),
];

const tier8: Puzzle[] = [
  makePuzzle(
    "8/8/5RP1/7p/2r2P1K/2kq3P/8/8 b - - 0 1",
    "black",
    8,
    "mate_in_8",
  ),
  makePuzzle(
    "5k2/7p/4p3/4qpp1/2R2RP1/p5KP/2b2P2/8 b - - 0 1",
    "black",
    8,
    "mate_in_8",
  ),
  makePuzzle(
    "r1b4r/p1p1Q3/1p2P2k/3Pp1pq/6p1/1PN5/P1P3PP/5RK1 w - - 0 1",
    "white",
    8,
    "mate_in_8",
  ),
];

const tier9: Puzzle[] = [
  makePuzzle(
    "8/1p6/p3P3/P1p5/1k1p4/1P5P/6K1/2r5 b - - 0 1",
    "black",
    9,
    "mate_in_9",
  ),
  makePuzzle(
    "8/5p2/p7/Pp4p1/1P1p2Kp/3k4/8/8 b - - 0 1",
    "black",
    9,
    "mate_in_9",
  ),
  makePuzzle(
    "8/r7/1K3pk1/8/6P1/4p3/3p4/3R4 b - - 0 1",
    "black",
    9,
    "mate_in_9",
  ),
];

const tier10: Puzzle[] = [
  makePuzzle(
    "8/p2k4/8/3p4/P3r3/8/3K4/8 b - - 0 1",
    "black",
    10,
    "mate_in_10",
  ),
  makePuzzle(
    "3k4/7r/2npp3/1Q6/4P1P1/K1R5/P7/8 w - - 0 1",
    "white",
    10,
    "mate_in_10",
  ),
  makePuzzle(
    "1k6/1p4b1/p1n3p1/4pnP1/3pq1Q1/7P/PP5K/8 b - - 3 3",
    "black",
    10,
    "mate_in_10",
  ),
];

const boss25: Puzzle[] = [
  makePuzzle(
    "8/8/8/8/8/1n2K3/1k6/1b6 b - - 1 1",
    "black",
    25,
    "final_boss",
  ),
];

const jsonTier1 = (mate1Raw as JsonPuzzle[]).map((puzzle, index) =>
  normalizeJsonPuzzle(1, index, puzzle),
);
const jsonTier2 = (mate2Raw as JsonPuzzle[]).map((puzzle, index) =>
  normalizeJsonPuzzle(2, index, puzzle),
);
const jsonTier3 = (mate3Raw as JsonPuzzle[]).map((puzzle, index) =>
  normalizeJsonPuzzle(3, index, puzzle),
);
const jsonTier4 = (mate4Raw as JsonPuzzle[]).map((puzzle, index) =>
  normalizeJsonPuzzle(4, index, puzzle),
);
const jsonTier5 = (mate5Raw as JsonPuzzle[]).map((puzzle, index) =>
  normalizeJsonPuzzle(5, index, puzzle),
);

export const KING_HUNTER_POOLS: Record<Tier, Puzzle[]> = {
  1: jsonTier1,
  2: jsonTier2,
  3: jsonTier3,
  4: jsonTier4,
  5: jsonTier5,
  6: tier6,
  7: tier7,
  8: tier8,
  9: tier9,
  10: tier10,
  25: boss25,
};

export function getRandomTierPuzzles(tier: Tier, count = 3) {
  return drawTier(
    KING_HUNTER_POOLS[tier],
    count,
  );
}

export function buildKingHunterSession(): DeckMap {
  return {
    1: getRandomTierPuzzles(1, 3),
    2: getRandomTierPuzzles(2, 3),
    3: getRandomTierPuzzles(3, 3),
    4: getRandomTierPuzzles(4, 3),
    5: getRandomTierPuzzles(5, 3),
    6: getRandomTierPuzzles(6, 3),
    7: getRandomTierPuzzles(7, 3),
    8: getRandomTierPuzzles(8, 3),
    9: getRandomTierPuzzles(9, 3),
    10: getRandomTierPuzzles(10, 3),
    25: getRandomTierPuzzles(25, 1),
  };
}

export function getTierLabel(tier: Tier) {
  if (tier === 25) return "Boss 25";
  return TIER_LABELS[tier as 1 | 2 | 3 | 4 | 5] ?? `Mate in ${tier}`;
}