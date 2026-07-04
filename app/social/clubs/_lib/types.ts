export type ClubRank =
  | "leader"
  | "co_leader"
  | "senior_admin"
  | "admin"
  | "coordinator"
  | "member";

export const CLUB_RANKS: ClubRank[] = [
  "leader",
  "co_leader",
  "senior_admin",
  "admin",
  "coordinator",
  "member",
];

export type Club = {
  id: string;
  title: string;
  title_search: string;
  description: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  created_by: string | null;
  disbanded_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ClubMember = {
  id: string;
  club_id: string;
  user_id: string;
  rank: ClubRank;
  muted: boolean | null;
  created_at: string | null;
};

export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  email?: string | null;
  bio?: string | null;
  last_login?: string | null;
  last_seen?: string | null;
};

export type ClubThread = {
  id: string;
  club_id: string;
  author_id: string | null;
  title: string;
  body: string;
  created_at: string | null;
};

export type ClubComment = {
  id: string;
  club_id: string;
  thread_id: string | null;
  author_id: string | null;
  body: string;
  created_at: string | null;
};

export type RankedMember = {
  member: ClubMember;
  profile?: Profile;
};

export type RankedGroup = {
  rank: ClubRank;
  members: RankedMember[];
};

export type ClubPageParams = Promise<{
  slug: string;
}>;

/* Backwards-compatible aliases for older files */
export type ClubRecord = Club;
export type ClubMemberRecord = ClubMember;
export type ProfileRecord = Profile;
export type ThreadRecord = ClubThread;
export type CommentRecord = ClubComment;