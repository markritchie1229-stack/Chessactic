"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Ban,
  Bell,
  CheckCircle2,
  DoorOpen,
  LockKeyhole,
  Search,
  ShieldAlert,
  ShieldBan,
  ShieldCheck,
  Swords,
  Trash2,
  UnlockKeyhole,
  UserRound,
} from "lucide-react";
import {
  adminDisbandClub,
  banUserIp,
  clearUserMute,
  closeUserAccount,
  getModerationReports,
  liftIpBan,
  openUserAccount,
  resolveModerationReport,
  searchClubsForModeration,
  searchUsersForModeration,
  setUserMute,
  replaceClubLeader,
} from "../../clubs/_lib/moderation.server";

type ModerationReport = {
  id: string;
  reporter_id: string;
  reporter_username: string | null;
  title: string | null;
  description: string;
  image_urls: string[];
  status: "open" | "resolved" | "dismissed";
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_note: string | null;
};

type ModerationUser = {
  id: string;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  bio: string | null;
  account_status: "active" | "closed" | string | null;
  muted_until: string | null;
  muted_indefinitely: boolean | null;
};

type ModerationClub = {
  id: string;
  title: string;
  title_search: string | null;
  disbanded_at: string | null;
  created_at: string | null;
};

type Tab = "reports" | "actions";

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
  }).format(date);
}

function formatMuteUntil(user: ModerationUser) {
  if (user.muted_indefinitely) return "Indefinitely";
  if (!user.muted_until) return "Not muted";
  return `Until ${formatDateTime(user.muted_until)}`;
}

function normalizeMaybeString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export default function AdminModerationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const initialTab: Tab = tabFromUrl === "actions" ? "actions" : "reports";

  const [activeTab, setActiveTab] = useState<Tab>(initialTab);

  const [reports, setReports] = useState<ModerationReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportsMessage, setReportsMessage] = useState("");
  const [reportNotes, setReportNotes] = useState<Record<string, string>>({});
  const [reportBusyId, setReportBusyId] = useState<string | null>(null);

  const [userQuery, setUserQuery] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersMessage, setUsersMessage] = useState("");
  const [users, setUsers] = useState<ModerationUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<ModerationUser | null>(null);
  const [muteMinutes, setMuteMinutes] = useState("60");
  const [muteIndefinitely, setMuteIndefinitely] = useState(false);
  const [ipAddress, setIpAddress] = useState("");
  const [ipReason, setIpReason] = useState("");
  const [userActionMessage, setUserActionMessage] = useState("");

  const [clubQuery, setClubQuery] = useState("");
  const [clubsLoading, setClubsLoading] = useState(false);
  const [clubsMessage, setClubsMessage] = useState("");
  const [clubs, setClubs] = useState<ModerationClub[]>([]);
  const [selectedClub, setSelectedClub] = useState<ModerationClub | null>(null);
  const [clubLeaderUserId, setClubLeaderUserId] = useState("");
  const [clubActionMessage, setClubActionMessage] = useState("");

  const activeTabLabel = useMemo(
    () => (activeTab === "reports" ? "Report inbox" : "Admin actions"),
    [activeTab],
  );

  const switchTab = (next: Tab) => {
    setActiveTab(next);
    router.replace(`/social/admin/moderation?tab=${next}`, { scroll: false });
  };

  const refreshReports = async () => {
    setReportsLoading(true);
    setReportsMessage("");

    try {
      const rows = (await getModerationReports()) as ModerationReport[];
      setReports(rows);
    } catch (error) {
      setReports([]);
      setReportsMessage(error instanceof Error ? error.message : "Could not load reports.");
    } finally {
      setReportsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab !== "reports") return;
    void refreshReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (tabFromUrl === "actions") {
      setActiveTab("actions");
    } else if (tabFromUrl === "reports" || !tabFromUrl) {
      setActiveTab("reports");
    }
  }, [tabFromUrl]);

  const runReportAction = async (
    reportId: string,
    status: "resolved" | "dismissed",
  ) => {
    setReportBusyId(reportId);
    setReportsMessage("");

    try {
      const note = reportNotes[reportId]?.trim() || null;
      await resolveModerationReport({ reportId, status, note });
      await refreshReports();
    } catch (error) {
      setReportsMessage(error instanceof Error ? error.message : "Could not update report.");
    } finally {
      setReportBusyId(null);
    }
  };

  const handleSearchUsers = async (event?: React.FormEvent) => {
    event?.preventDefault();

    const term = userQuery.trim();
    setUsersLoading(true);
    setUsersMessage("");

    try {
      if (!term) {
        setUsers([]);
        setUsersMessage("Type a username, email, or user ID.");
        return;
      }

      const rows = (await searchUsersForModeration(term)) as ModerationUser[];
      setUsers(rows);
      setSelectedUser(rows[0] ?? null);
      setUserActionMessage("");
    } catch (error) {
      setUsers([]);
      setUsersMessage(error instanceof Error ? error.message : "Could not search users.");
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSearchClubs = async (event?: React.FormEvent) => {
    event?.preventDefault();

    const term = clubQuery.trim();
    setClubsLoading(true);
    setClubsMessage("");

    try {
      if (!term) {
        setClubs([]);
        setClubsMessage("Type a club name.");
        return;
      }

      const rows = (await searchClubsForModeration(term)) as ModerationClub[];
      setClubs(rows);
      setSelectedClub(rows[0] ?? null);
      setClubLeaderUserId("");
      setClubActionMessage("");
    } catch (error) {
      setClubs([]);
      setClubsMessage(error instanceof Error ? error.message : "Could not search clubs.");
    } finally {
      setClubsLoading(false);
    }
  };

const doMute = async () => {
  if (!selectedUser) return;

  setUserActionMessage("");

  try {
    const parsedMinutes = Number(muteMinutes);

    if (!muteIndefinitely) {
      if (!Number.isFinite(parsedMinutes) || parsedMinutes <= 0) {
        setUserActionMessage("Provide a mute duration greater than 0 minutes.");
        return;
      }
    }

    const mutedUntil = muteIndefinitely
      ? null
      : new Date(Date.now() + parsedMinutes * 60_000).toISOString();

    await setUserMute({
      userId: selectedUser.id,
      muteForMinutes: muteIndefinitely ? null : parsedMinutes,
      muteIndefinitely,
    });

    const updatedUser = {
      ...selectedUser,
      muted_indefinitely: muteIndefinitely,
      muted_until: mutedUntil,
      account_status: "active",
    };

    setSelectedUser(updatedUser);
    setUsers((prev) =>
      prev.map((user) => (user.id === selectedUser.id ? updatedUser : user)),
    );

    setUserActionMessage(
      muteIndefinitely
        ? `Muted ${selectedUser.username ?? selectedUser.email ?? selectedUser.id} indefinitely.`
        : `Muted ${selectedUser.username ?? selectedUser.email ?? selectedUser.id} for ${parsedMinutes} minutes.`,
    );
  } catch (error) {
    setUserActionMessage(error instanceof Error ? error.message : "Could not mute user.");
  }
};

  const doUnmute = async () => {
    if (!selectedUser) return;

    setUserActionMessage("");

    try {
      await clearUserMute(selectedUser.id);
      setUserActionMessage(`Unmuted ${selectedUser.username ?? selectedUser.email ?? selectedUser.id}.`);
      await handleSearchUsers();
    } catch (error) {
      setUserActionMessage(error instanceof Error ? error.message : "Could not unmute user.");
    }
  };

  const doCloseAccount = async () => {
  if (!selectedUser) return;

  setUserActionMessage("");

  try {
    await closeUserAccount(selectedUser.id);

    const updatedUser = {
      ...selectedUser,
      account_status: "closed",
    };

    setSelectedUser(updatedUser);
    setUsers((prev) =>
      prev.map((user) => (user.id === selectedUser.id ? updatedUser : user)),
    );

    setUserActionMessage(
      `Closed ${selectedUser.username ?? selectedUser.email ?? selectedUser.id}.`,
    );
  } catch (error) {
    setUserActionMessage(error instanceof Error ? error.message : "Could not close account.");
  }
};

const doOpenAccount = async () => {
  if (!selectedUser) return;

  setUserActionMessage("");

  try {
    await openUserAccount(selectedUser.id);

    const updatedUser = {
      ...selectedUser,
      account_status: "active",
    };

    setSelectedUser(updatedUser);
    setUsers((prev) =>
      prev.map((user) => (user.id === selectedUser.id ? updatedUser : user)),
    );

    setUserActionMessage(
      `Reopened ${selectedUser.username ?? selectedUser.email ?? selectedUser.id}.`,
    );
  } catch (error) {
    setUserActionMessage(error instanceof Error ? error.message : "Could not open account.");
  }
};

  const doBanIp = async () => {
    if (!selectedUser) return;

    setUserActionMessage("");

    try {
      if (!ipAddress.trim()) {
        setUserActionMessage("Enter an IP address.");
        return;
      }

      await banUserIp({
        userId: selectedUser.id,
        ipAddress,
        reason: ipReason || null,
      });

      setUserActionMessage(`Banned IP ${ipAddress.trim()} for ${selectedUser.username ?? selectedUser.id}.`);
    } catch (error) {
      setUserActionMessage(error instanceof Error ? error.message : "Could not ban IP.");
    }
  };

  const doLiftIpBan = async () => {
    if (!selectedUser) return;

    setUserActionMessage("");

    try {
      if (!ipAddress.trim()) {
        setUserActionMessage("Enter an IP address.");
        return;
      }

      await liftIpBan({
        userId: selectedUser.id,
        ipAddress,
      });

      setUserActionMessage(`Lifted IP ban for ${selectedUser.username ?? selectedUser.id}.`);
    } catch (error) {
      setUserActionMessage(error instanceof Error ? error.message : "Could not lift IP ban.");
    }
  };

  const doReplaceLeader = async () => {
    if (!selectedClub) return;

    const targetUserId = (clubLeaderUserId || selectedUser?.id || "").trim();
    if (!targetUserId) {
      setClubActionMessage("Select a user or paste a user ID first.");
      return;
    }

    setClubActionMessage("");

    try {
      const result = await replaceClubLeader({
        clubId: selectedClub.id,
        newLeaderUserId: targetUserId,
      });

      setClubActionMessage(
        result.status === "already_leader"
          ? "That user is already the leader."
          : "Club leader replaced.",
      );
    } catch (error) {
      setClubActionMessage(error instanceof Error ? error.message : "Could not replace leader.");
    }
  };

  const doDisbandClub = async () => {
    if (!selectedClub) return;

    const ok = window.confirm(`Disband "${selectedClub.title}"? This cannot be undone.`);
    if (!ok) return;

    setClubActionMessage("");

    try {
      await adminDisbandClub(selectedClub.id);
      setClubActionMessage(`Disbanded ${selectedClub.title}.`);
      await handleSearchClubs();
    } catch (error) {
      setClubActionMessage(error instanceof Error ? error.message : "Could not disband club.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm uppercase tracking-wide text-slate-400">
              Moderation
            </div>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">
              Admin moderation
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              Review reports, mute or reopen accounts, apply IP bans, and manage clubs from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => switchTab("reports")}
              className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                activeTab === "reports"
                  ? "bg-slate-100 text-slate-950"
                  : "border border-slate-800 bg-slate-950 text-slate-100 hover:bg-slate-800"
              }`}
            >
              Report inbox
            </button>
            <button
              type="button"
              onClick={() => switchTab("actions")}
              className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                activeTab === "actions"
                  ? "bg-slate-100 text-slate-950"
                  : "border border-slate-800 bg-slate-950 text-slate-100 hover:bg-slate-800"
              }`}
            >
              Admin actions
            </button>
          </div>
        </div>
      </div>

      {activeTab === "reports" ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-slate-400">
            <MailIcon />
            <span className="text-sm uppercase tracking-wide">{activeTabLabel}</span>
          </div>

          {reportsLoading ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-slate-400">
              Loading reports...
            </div>
          ) : reportsMessage ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-300">
              {reportsMessage}
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-400">
              No reports yet.
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <article
                  key={report.id}
                  className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-semibold">
                          {report.title?.trim() || "Untitled report"}
                        </h2>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                            report.status === "open"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                              : report.status === "resolved"
                                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                : "border-slate-500/30 bg-slate-500/10 text-slate-300"
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>

                      <div className="text-sm text-slate-400">
                        By {report.reporter_username ?? report.reporter_id} • {formatDateTime(report.created_at)}
                      </div>

                      <p className="max-w-4xl whitespace-pre-wrap text-sm leading-6 text-slate-200">
                        {report.description}
                      </p>

                      {report.image_urls.length ? (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {report.image_urls.map((url) => (
                            <a
                              key={url}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/70"
                            >
                              <img
                                src={url}
                                alt="Report attachment"
                                className="h-48 w-full object-cover"
                              />
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="w-full max-w-md space-y-3">
                      <label className="block text-sm text-slate-300">
                        Review note
                      </label>
                      <textarea
                        value={reportNotes[report.id] ?? ""}
                        onChange={(e) =>
                          setReportNotes((prev) => ({
                            ...prev,
                            [report.id]: e.target.value,
                          }))
                        }
                        rows={4}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-slate-500"
                        placeholder="Optional note for this report..."
                      />

                      {report.review_note ? (
                        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-300">
                          <div className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                            Existing review note
                          </div>
                          {report.review_note}
                        </div>
                      ) : null}

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void runReportAction(report.id, "resolved")}
                          disabled={reportBusyId === report.id}
                          className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500/15 px-4 py-2 text-sm font-medium text-emerald-300 transition hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Resolve
                        </button>
                        <button
                          type="button"
                          onClick={() => void runReportAction(report.id, "dismissed")}
                          disabled={reportBusyId === report.id}
                          className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          <Trash2 className="h-4 w-4" />
                          Dismiss
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          {reportsMessage ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-4 text-sm text-slate-300">
              {reportsMessage}
            </div>
          ) : null}
        </section>
      ) : (
        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-400" />
                <h2 className="text-lg font-semibold">Search users</h2>
              </div>

              <form onSubmit={handleSearchUsers} className="mt-4 flex gap-2">
                <input
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-slate-500"
                  placeholder="Search by username, email, or user ID"
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-slate-100 px-4 py-3 font-medium text-slate-950 transition hover:bg-white"
                >
                  Search
                </button>
              </form>

              {usersLoading ? (
                <div className="mt-4 text-sm text-slate-400">Searching...</div>
              ) : usersMessage ? (
                <div className="mt-4 text-sm text-slate-400">{usersMessage}</div>
              ) : null}

              <div className="mt-4 space-y-2">
                {users.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => setSelectedUser(user)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      selectedUser?.id === user.id
                        ? "border-slate-500 bg-slate-950"
                        : "border-slate-800 bg-slate-950/60 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-100">
                          {user.username ?? user.email ?? user.id}
                        </div>
                        <div className="text-xs text-slate-500">
                          {user.email ?? user.id}
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        <div>{user.account_status ?? "active"}</div>
                        <div>{formatMuteUntil(user)}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-slate-400" />
                <h2 className="text-lg font-semibold">Search clubs</h2>
              </div>

              <form onSubmit={handleSearchClubs} className="mt-4 flex gap-2">
                <input
                  value={clubQuery}
                  onChange={(e) => setClubQuery(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none focus:border-slate-500"
                  placeholder="Search clubs by title"
                />
                <button
                  type="submit"
                  className="rounded-2xl bg-slate-100 px-4 py-3 font-medium text-slate-950 transition hover:bg-white"
                >
                  Search
                </button>
              </form>

              {clubsLoading ? (
                <div className="mt-4 text-sm text-slate-400">Searching...</div>
              ) : clubsMessage ? (
                <div className="mt-4 text-sm text-slate-400">{clubsMessage}</div>
              ) : null}

              <div className="mt-4 space-y-2">
                {clubs.map((club) => (
                  <button
                    key={club.id}
                    type="button"
                    onClick={() => setSelectedClub(club)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                      selectedClub?.id === club.id
                        ? "border-slate-500 bg-slate-950"
                        : "border-slate-800 bg-slate-950/60 hover:bg-slate-900"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-100">{club.title}</div>
                        <div className="text-xs text-slate-500">
                          {club.title_search ?? club.id}
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        <div>{club.disbanded_at ? "Disbanded" : "Active"}</div>
                        <div>{formatDateOnly(club.created_at)}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 text-slate-400" />
                <h2 className="text-lg font-semibold">Selected user</h2>
              </div>

              {selectedUser ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="font-medium text-slate-100">
                      {selectedUser.username ?? selectedUser.email ?? selectedUser.id}
                    </div>
                    <div className="mt-1 text-sm text-slate-400">
                      {selectedUser.email ?? selectedUser.id}
                    </div>
                    <div className="mt-2 grid gap-1 text-sm text-slate-400">
                      <div>Status: {selectedUser.account_status ?? "active"}</div>
                      <div>Mute: {formatMuteUntil(selectedUser)}</div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm text-slate-300">
                        Mute minutes
                      </label>
                      <input
                        value={muteMinutes}
                        onChange={(e) => setMuteMinutes(e.target.value)}
                        disabled={muteIndefinitely}
                        inputMode="numeric"
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none disabled:opacity-50"
                        placeholder="60"
                      />
                    </div>

                    <label className="mt-7 inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-3 text-sm text-slate-200">
                      <input
                        type="checkbox"
                        checked={muteIndefinitely}
                        onChange={(e) => setMuteIndefinitely(e.target.checked)}
                        className="h-4 w-4"
                      />
                      Mute indefinitely
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => void doMute()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-amber-500/15 px-4 py-3 text-sm font-medium text-amber-300 transition hover:bg-amber-500/20"
                  >
                    <Bell className="h-4 w-4" />
                    Mute user
                  </button>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void doUnmute()}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                    >
                      <UnlockKeyhole className="h-4 w-4" />
                      Unmute
                    </button>

                    <button
                      type="button"
                      onClick={() => void doCloseAccount()}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                    >
                      <LockKeyhole className="h-4 w-4" />
                      Close account
                    </button>

                    <button
                      type="button"
                      onClick={() => void doOpenAccount()}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                    >
                      <DoorOpen className="h-4 w-4" />
                      Open account
                    </button>
                  </div>

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="text-sm font-medium text-slate-100">IP actions</div>
                    <div className="mt-3 space-y-3">
                      <input
                        value={ipAddress}
                        onChange={(e) => setIpAddress(e.target.value)}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                        placeholder="IP address"
                      />
                      <input
                        value={ipReason}
                        onChange={(e) => setIpReason(e.target.value)}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                        placeholder="Reason (optional)"
                      />
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void doBanIp()}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                        >
                          <ShieldBan className="h-4 w-4" />
                          IP ban
                        </button>
                        <button
                          type="button"
                          onClick={() => void doLiftIpBan()}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                        >
                          <ShieldCheck className="h-4 w-4" />
                          Lift IP ban
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400">
                  Search and select a user to start moderation actions.
                </p>
              )}

              {userActionMessage ? (
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                  {userActionMessage}
                </div>
              ) : null}
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
              <div className="flex items-center gap-2">
                <Swords className="h-4 w-4 text-slate-400" />
                <h2 className="text-lg font-semibold">Selected club</h2>
              </div>

              {selectedClub ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                    <div className="font-medium text-slate-100">{selectedClub.title}</div>
                    <div className="mt-1 text-sm text-slate-400">
                      {selectedClub.title_search ?? selectedClub.id}
                    </div>
                    <div className="mt-2 text-sm text-slate-400">
                      {selectedClub.disbanded_at ? "Disbanded" : "Active"}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">
                      Replace leader with user ID
                    </label>
                    <input
                      value={clubLeaderUserId || selectedUser?.id || ""}
                      onChange={(e) => setClubLeaderUserId(e.target.value)}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none"
                      placeholder="Paste a user ID or use the selected user"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => void doReplaceLeader()}
                      className="inline-flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-sm font-medium text-slate-950 transition hover:bg-white"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      Replace leader
                    </button>

                    <button
                      type="button"
                      onClick={() => void doDisbandClub()}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-slate-800"
                    >
                      <Trash2 className="h-4 w-4" />
                      Disband club
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-400">
                  Search and select a club to manage it.
                </p>
              )}

              {clubActionMessage ? (
                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
                  {clubActionMessage}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function MailIcon() {
  return <Bell className="h-4 w-4" />;
}