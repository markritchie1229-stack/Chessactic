export type ClubRank =
  | "leader"
  | "co-leader"
  | "senior admin"
  | "admin"
  | "coordinator"
  | "member";

export type ClubRecord = {
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

export type ClubMemberRecord = {
  id: string;
  club_id: string;
  user_id: string;
  rank: ClubRank;
  muted: boolean | null;
  created_at: string | null;
};

export type ProfileRecord = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  last_seen?: string | null;
  bio?: string | null;
};

export type ThreadRecord = {
  id: string;
  club_id: string;
  author_id: string | null;
  title: string;
  created_at: string | null;
};

export type CommentRecord = {
  id: string;
  club_id: string;
  author_id: string | null;
  body: string;
  created_at: string | null;
};

export type RankedMember = {
  member: ClubMemberRecord;
  profile: ProfileRecord | undefined;
};

export type RankedGroup = {
  rank: ClubRank;
  members: RankedMember[];
};

export type ClubPageParams = Promise<{
  slug: string;
}>;