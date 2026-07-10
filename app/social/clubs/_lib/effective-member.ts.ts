import type { ClubMember } from "./types";

export function makeSiteAdminMember(clubId: string, userId: string): ClubMember {
  return {
    id: `site-admin-${clubId}`,
    club_id: clubId,
    user_id: userId,
    rank: "leader",
    muted: false,
    created_at: null,
  };
}