import type { ClubMember, ClubRank } from "./types";
import { isHigherRank } from "./ranks";

export function canOpenSettings(rank: ClubRank) {
  return rank === "leader" || rank === "co_leader";
}

export function canInvite(rank: ClubRank) {
  return (
    rank === "leader" ||
    rank === "co_leader" ||
    rank === "senior_admin" ||
    rank === "admin" ||
    rank === "coordinator"
  );
}

export function canComment(member: ClubMember) {
  return !member.muted;
}

export function canCreateThread(member: ClubMember) {
  return !member.muted;
}

export function canDeleteThread(rank: ClubRank) {
  return (
    rank === "leader" ||
    rank === "co_leader" ||
    rank === "senior_admin" ||
    rank === "admin"
  );
}

export function canDeleteComment(rank: ClubRank) {
  return canDeleteThread(rank);
}

export function canMute(actor: ClubRank, target: ClubRank) {
  if (actor === "leader") return target !== "leader";
  if (actor === "co_leader") return isHigherRank(actor, target);
  if (actor === "senior_admin") return isHigherRank(actor, target);
  if (actor === "admin") return isHigherRank(actor, target);
  return false;
}

export function canKick(actor: ClubRank, target: ClubRank) {
  if (actor === "leader") return target !== "leader";
  if (actor === "co_leader") return isHigherRank(actor, target);
  if (actor === "senior_admin") return isHigherRank(actor, target);
  return false;
}

export function canPromote(actor: ClubRank, target: ClubRank) {
  if (actor === "leader") return target !== "leader";

  if (actor === "co_leader") {
    return (
      target === "senior_admin" ||
      target === "admin" ||
      target === "coordinator" ||
      target === "member"
    );
  }

  if (actor === "senior_admin") {
    return (
      target === "admin" ||
      target === "coordinator" ||
      target === "member"
    );
  }

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

export function canChangeJoinPolicy(rank: ClubRank) {
  return rank === "leader" || rank === "co_leader";
}

/* NEW */

export function canReviewJoinRequests(rank: ClubRank) {
  return (
    rank === "leader" ||
    rank === "co_leader" ||
    rank === "senior_admin" ||
    rank === "admin" ||
    rank === "coordinator"
  );
}