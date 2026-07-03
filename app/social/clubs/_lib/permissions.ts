import type { ClubMemberRecord, ClubRank } from "./types";
import { isHigherRank } from "./ranks";

export function isLeader(rank: ClubRank) {
  return rank === "Leader";
}

export function isCoLeader(rank: ClubRank) {
  return rank === "Co-Leader";
}

export function canOpenSettings(rank: ClubRank) {
  return rank === "Leader" || rank === "Co-Leader";
}

export function canInvite(rank: ClubRank) {
  return (
    rank === "Leader" ||
    rank === "Co-Leader" ||
    rank === "Senior Admin" ||
    rank === "Admin" ||
    rank === "Coordinator"
  );
}

export function canCreateThread(member: ClubMemberRecord) {
  return !member.muted;
}

export function canComment(member: ClubMemberRecord) {
  return !member.muted;
}

export function canDeleteThread(rank: ClubRank) {
  return (
    rank === "Leader" ||
    rank === "Co-Leader" ||
    rank === "Senior Admin" ||
    rank === "Admin"
  );
}

export function canDeleteComment(rank: ClubRank) {
  return canDeleteThread(rank);
}

export function canKick(actor: ClubRank, target: ClubRank) {
  if (actor === "Leader") return target !== "Leader";

  if (actor === "Co-Leader")
    return isHigherRank(actor, target);

  if (actor === "Senior Admin")
    return isHigherRank(actor, target);

  return false;
}

export function canMute(actor: ClubRank, target: ClubRank) {
  if (actor === "Leader") return target !== "Leader";

  if (actor === "Co-Leader")
    return isHigherRank(actor, target);

  if (actor === "Senior Admin")
    return isHigherRank(actor, target);

  if (actor === "Admin")
    return isHigherRank(actor, target);

  return false;
}

export function canPromote(actor: ClubRank, target: ClubRank) {
  if (actor === "Leader") return target !== "Leader";

  if (actor === "Co-Leader")
    return (
      target === "Senior Admin" ||
      target === "Admin" ||
      target === "Coordinator" ||
      target === "Member"
    );

  if (actor === "Senior Admin")
    return (
      target === "Admin" ||
      target === "Coordinator" ||
      target === "Member"
    );

  return false;
}

export function canDemote(actor: ClubRank, target: ClubRank) {
  return canPromote(actor, target);
}

export function canTransferLeadership(rank: ClubRank) {
  return rank === "Leader";
}

export function canDisbandClub(rank: ClubRank) {
  return rank === "Leader";
}