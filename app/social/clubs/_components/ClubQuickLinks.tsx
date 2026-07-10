"use client";

import Link from "next/link";
import {
  CalendarDays,
  Crown,
  Gauge,
  MessageSquareText,
  Settings2,
  Users,
  UserPlus,
} from "lucide-react";

type ClubSection = "club" | "members" | "invite" | "forum" | "settings";

type Props = {
  base: string;
  active: ClubSection;
  clubId: string;
  collapsed?: boolean;
};

type QuickLink = {
  key: ClubSection;
  href: string;
  label: string;
  icon: React.ElementType;
};

export function ClubQuickLinks({
  base,
  active,
  collapsed = false,
}: Props) {
  const links: QuickLink[] = [
    {
      key: "club",
      href: `${base}`,
      label: "Overview",
      icon: Gauge,
    },
    {
      key: "members",
      href: `${base}/members`,
      label: "Members",
      icon: Users,
    },
    {
      key: "invite",
      href: `${base}/invite`,
      label: "Invite",
      icon: UserPlus,
    },
    {
      key: "forum",
      href: `${base}/forum`,
      label: "Forum",
      icon: MessageSquareText,
    },
    {
      key: "settings",
      href: `${base}/settings`,
      label: "Settings",
      icon: Settings2,
    },
  ];

  return (
    <nav className="space-y-3">
      <div className="rounded-3xl border border-white/10 bg-slate-950/35 p-3 shadow-2xl shadow-black/20 backdrop-blur-md">
        {!collapsed ? (
          <div className="mb-3 px-2 text-[10px] uppercase tracking-[0.24em] text-slate-400">
            Club navigation
          </div>
        ) : null}

        <div className="space-y-2">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = active === link.key;

            return (
              <Link
                key={link.key}
                href={link.href}
                title={link.label}
                aria-label={link.label}
                className={[
                  "group flex items-center rounded-2xl border px-3 py-3 text-sm font-medium transition",
                  collapsed ? "justify-center gap-0" : "gap-3",
                  isActive
                    ? "border-white/15 bg-white/10 text-white"
                    : "border-white/5 bg-white/0 text-slate-200 hover:border-white/10 hover:bg-white/5",
                ].join(" ")}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed ? <span>{link.label}</span> : null}
              </Link>
            );
          })}
        </div>

        {!collapsed ? (
          <div className="mt-3 rounded-2xl border border-white/5 bg-white/5 px-3 py-2 text-xs leading-5 text-slate-400">
            Use the toggle to collapse this rail and give the club page more room.
          </div>
        ) : null}
      </div>
    </nav>
  );
}