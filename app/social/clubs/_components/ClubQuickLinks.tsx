import Link from "next/link";
import {
  BadgeInfo,
  Settings2,
  UserPlus,
  Users,
} from "lucide-react";

type Props = {
  base: string;
  active: "club" | "members" | "invite" | "forum" | "settings";
};

function buttonClass(selected: boolean) {
  return selected
    ? "inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500 bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950"
    : "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800";
}

export function ClubQuickLinks({ base, active }: Props) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/85 p-3 shadow-lg shadow-black/20">
      <div className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
        Quick links
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
        <Link
          href={`${base}/members`}
          className={buttonClass(active === "members")}
        >
          <Users className="h-4 w-4" />
          Members
        </Link>

        <Link
          href={`${base}/invite`}
          className={buttonClass(active === "invite")}
        >
          <UserPlus className="h-4 w-4" />
          Invite
        </Link>

        <Link
          href={`${base}/forum`}
          className={buttonClass(active === "forum")}
        >
          <BadgeInfo className="h-4 w-4" />
          Forum
        </Link>

        <Link
          href={`${base}/settings`}
          className={buttonClass(active === "settings")}
        >
          <Settings2 className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </div>
  );
}