import Link from "next/link";
import {
  Home,
  Users,
  UserPlus,
  MessageSquare,
  Settings,
} from "lucide-react";

type ActiveSection =
  | "club"
  | "members"
  | "invite"
  | "forum"
  | "settings";

type Props = {
  base: string;
  active: ActiveSection;
};

function buttonClass(selected: boolean) {
  return selected
    ? "flex items-center gap-3 rounded-2xl border border-cyan-500 bg-cyan-500 px-4 py-3 font-medium text-slate-950 transition"
    : "flex items-center gap-3 rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-200 transition hover:border-cyan-500 hover:bg-slate-800";
}

export function ClubQuickLinks({
  base,
  active,
}: Props) {
  return (
    <section className="rounded-3xl border border-slate-800 bg-slate-900 p-4 shadow-2xl shadow-black/20">

      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
        Navigation
      </div>

      <nav className="space-y-2">

        <Link
          href={base}
          className={buttonClass(active === "club")}
        >
          <Home className="h-5 w-5" />
          Overview
        </Link>

        <Link
          href={`${base}/members`}
          className={buttonClass(active === "members")}
        >
          <Users className="h-5 w-5" />
          Members
        </Link>

        <Link
          href={`${base}/invite`}
          className={buttonClass(active === "invite")}
        >
          <UserPlus className="h-5 w-5" />
          Invite
        </Link>

        <Link
          href={`${base}/forum`}
          className={buttonClass(active === "forum")}
        >
          <MessageSquare className="h-5 w-5" />
          Forum
        </Link>

        <Link
          href={`${base}/settings`}
          className={buttonClass(active === "settings")}
        >
          <Settings className="h-5 w-5" />
          Settings
        </Link>

      </nav>

    </section>
  );
}