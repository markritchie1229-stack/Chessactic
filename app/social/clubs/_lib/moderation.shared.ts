import type { Profile } from "./types";

export const SITE_ADMIN_USERNAME = "mark12291229";

export function normalizeHandle(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function isSiteAdminUsername(value: string | null | undefined) {
  return normalizeHandle(value) === SITE_ADMIN_USERNAME;
}

export function isSiteAdminProfile(profile: Pick<Profile, "username"> | null | undefined) {
  return isSiteAdminUsername(profile?.username ?? null);
}

export function formatMaybeDate(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
