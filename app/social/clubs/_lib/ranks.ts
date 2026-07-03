import type { ClubRank } from "./types";

export const RANK_ORDER: ClubRank[] = [
  "leader",
  "co-leader",
  "senior admin",
  "admin",
  "coordinator",
  "member",
];

export function getRankIndex(rank: ClubRank): number {
  return RANK_ORDER.indexOf(rank);
}

export function isHigherRank(a: ClubRank, b: ClubRank): boolean {
  return getRankIndex(a) < getRankIndex(b);
}

export function isHigherOrEqualRank(a: ClubRank, b: ClubRank): boolean {
  return getRankIndex(a) <= getRankIndex(b);
}

export function isLowerRank(a: ClubRank, b: ClubRank): boolean {
  return getRankIndex(a) > getRankIndex(b);
}

export function isLowerOrEqualRank(a: ClubRank, b: ClubRank): boolean {
  return getRankIndex(a) >= getRankIndex(b);
}

export function canPromoteTo(target: ClubRank): boolean {
  return target !== "leader";
}

export function getNextHigherRank(rank: ClubRank): ClubRank | null {
  const index = getRankIndex(rank);
  if (index <= 0) return null;
  return RANK_ORDER[index - 1];
}

export function getNextLowerRank(rank: ClubRank): ClubRank | null {
  const index = getRankIndex(rank);
  if (index < 0 || index >= RANK_ORDER.length - 1) return null;
  return RANK_ORDER[index + 1];
}

export function formatRankLabel(rank: ClubRank): string {
  return rank.toUpperCase();
}