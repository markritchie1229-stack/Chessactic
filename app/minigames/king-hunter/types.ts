import type { Chess } from "chess.js";

export type SideToMove = "white" | "black";

export type Tier =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 25;

export type GameStatus = "idle" | "playing" | "won" | "lost";

export type Puzzle = {
  fen: string;
  solution?: string;
  sample_line?: string[];
  mate_length: number;
  side_to_move: SideToMove;
  theme?: string;
};

export type DeckMap = Record<Tier, Puzzle[]>;

export interface GameState {
  board: Chess;
  currentTier: Tier;
  currentPuzzleIndex: number;
  movesRemaining: number;
  status: GameStatus;
  message: string;
  engineBusy: boolean;
}

export interface PuzzleResult {
  solved: boolean;
  failed: boolean;
  movesUsed: number;
}

export interface TierInfo {
  tier: Tier;
  label: string;
  puzzleCount: number;
}

export const TIER_LABELS: Record<Tier, string> = {
  1: "Mate in 1",
  2: "Mate in 2",
  3: "Mate in 3",
  4: "Mate in 4",
  5: "Mate in 5",
  6: "Mate in 6",
  7: "Mate in 7",
  8: "Mate in 8",
  9: "Mate in 9",
  10: "Mate in 10",
  25: "Final Boss",
};

export const TIER_MOVE_LIMITS: Record<Tier, number> = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  8: 8,
  9: 9,
  10: 10,
  25: 25,
};