import type { ClubRank } from "./types";

export const RANK_ORDER: ClubRank[] = [
  "leader",
  "co_leader",
  "senior_admin",
  "admin",
  "coordinator",
  "member",
];

export function getRankIndex(rank: ClubRank): number {
  return RANK_ORDER.indexOf(rank);
}

export function isHigherRank(
  actor: ClubRank,
  target: ClubRank,
): boolean {
  return getRankIndex(actor) < getRankIndex(target);
}

export function isHigherOrEqualRank(
  actor: ClubRank,
  target: ClubRank,
): boolean {
  return getRankIndex(actor) <= getRankIndex(target);
}

export function isLowerRank(
  actor: ClubRank,
  target: ClubRank,
): boolean {
  return getRankIndex(actor) > getRankIndex(target);
}

export function getNextHigherRank(
  rank: ClubRank,
): ClubRank | null {
  const index = getRankIndex(rank);

  if (index <= 0) {
    return null;
  }

  return RANK_ORDER[index - 1];
}

export function getNextLowerRank(
  rank: ClubRank,
): ClubRank | null {
  const index = getRankIndex(rank);

  if (index === -1 || index >= RANK_ORDER.length - 1) {
    return null;
  }

  return RANK_ORDER[index + 1];
}

export function isLeader(rank: ClubRank) {
  return rank === "leader";
}

export function isCoLeader(rank: ClubRank) {
  return rank === "co_leader";
}

export function formatRank(rank: ClubRank): string {
  switch (rank) {
    case "leader":
      return "Leader";

    case "co_leader":
      return "Co-Leader";

    case "senior_admin":
      return "Senior Admin";

    case "admin":
      return "Admin";

    case "coordinator":
      return "Coordinator";

    case "member":
      return "Member";

    default:
      return rank;
  }
}