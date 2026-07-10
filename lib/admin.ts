export const ADMIN_IDS = new Set([
  "04b6e9ec-e476-4e66-9d1f-371946a77ab4",
]);

export function isAdmin(userId: string | null | undefined) {
  return !!userId && ADMIN_IDS.has(userId);
}