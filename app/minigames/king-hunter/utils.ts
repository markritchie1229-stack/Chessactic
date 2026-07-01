import type { Puzzle } from "./types";

export function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function drawTier(pool: Puzzle[], count = 3) {
  return shuffle(pool).slice(0, Math.min(count, pool.length));
}

export function normalizeUci(value: string) {
  return value.replace(/\s+/g, "").toLowerCase();
}

export function formatMovesRemaining(value: number) {
  return `${value} move${value === 1 ? "" : "s"} remaining.`;
}