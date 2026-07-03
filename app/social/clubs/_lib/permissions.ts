import type { ClubMemberRecord, ClubRank } from "./types";
import { isHigherRank } from "./ranks";

export function isLeader(rank: ClubRank) {
  return rank === "leader";
}

export function isCoLeader(rank: ClubRank) {
  return rank === "co-leader";
}

export function canOpenSettings(rank: ClubRank) {
  return rank === "leader" || rank === "co-leader";
}

export function canInvite(rank: ClubRank) {
  return (
    rank === "leader" ||
    rank === "co-leader" ||
    rank === "senior admin" ||
    rank === "admin" ||
    rank === "coordinator"
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
    rank === "leader" ||
    rank === "co-leader" ||
    rank === "senior admin" ||
    rank === "admin"
  );
}

export function canDeleteComment(rank: ClubRank) {
  return canDeleteThread(rank);
}

export function canKick(actor: ClubRank, target: ClubRank) {
  if (actor === "leader") return target !== "leader";

  if (actor === "co-leader") return isHigherRank(actor, target);

  if (actor === "senior admin") return isHigherRank(actor, target);

  return false;
}

export function canMute(actor: ClubRank, target: ClubRank) {
  if (actor === "leader") return target !== "leader";

  if (actor === "co-leader") return isHigherRank(actor, target);

  if (actor === "senior admin") return isHigherRank(actor, target);

  if (actor === "admin") return isHigherRank(actor, target);

  return false;
}

export function canPromote(actor: ClubRank, target: ClubRank) {
  if (actor === "leader") return target !== "leader";

  if (actor === "co-leader")
    return (
      target === "senior admin" ||
      target === "admin" ||
      target === "coordinator" ||
      target === "member"
    );

  if (actor === "senior admin")
    return target === "admin" || target === "coordinator" || target === "member";

  return false;
}

export function canDemote(actor: ClubRank, target: ClubRank) {
  return canPromote(actor, target);
}

export function canTransferLeadership(rank: ClubRank) {
  return rank === "leader";
}

export function canDisbandClub(rank: ClubRank) {
  return rank === "leader";
}