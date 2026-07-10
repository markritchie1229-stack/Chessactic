"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Hash,
  MessageSquareMore,
  Search,
  Shield,
  UserCircle2,
  Users,
} from "lucide-react";

const links = [
  {
    href: "/social/profile",
    label: "Profile",
    icon: UserCircle2,
  },
  {
    href: "/social/messages",
    label: "Messages",
    icon: MessageSquareMore,
  },
  {
    href: "/social/friends",
    label: "Friends",
    icon: Users,
  },
  {
    href: "/social/members",
    label: "Members",
    icon: Search,
  },
  {
    href: "/social/clubs",
    label: "Clubs",
    icon: Shield,
  },
  {
    href: "/social/forum",
    label: "Forum",
    icon: Hash,
  },
];

const STORAGE_KEY = "social-sidebar-collapsed";

export default function SocialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);

    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      setCollapsed(saved === "true");
    } catch {
      // ignore storage errors
    }
  }, []);

  useEffect(() => {
    if (!ready) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // ignore storage errors
    }
  }, [collapsed, ready]);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl">
        <aside
          className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-slate-800 bg-slate-900/90 transition-all duration-300 ${
            collapsed ? "w-20 p-3" : "w-72 p-6"
          }`}
        >
          <div className="mb-6 flex items-center justify-between gap-3">
            {!collapsed ? (
              <Link
                href="/"
                className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to main page
              </Link>
            ) : (
              <Link
                href="/"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 text-slate-300 hover:bg-slate-800 hover:text-white"
                aria-label="Back to Chessactic"
                title="Back to Chessactic"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>
            )}

            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 text-slate-300 transition hover:bg-slate-800 hover:text-white"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </button>
          </div>

          {!collapsed ? (
            <div className="mb-8">
              <h1 className="text-3xl font-bold">Social</h1>
              <p className="mt-2 text-sm text-slate-500">Community features</p>
            </div>
          ) : (
            <div className="mb-8 flex justify-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 text-lg font-bold text-slate-100">
                S
              </div>
            </div>
          )}

          <nav className="space-y-2">
            {links.map((link) => {
              const Icon = link.icon;
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center rounded-2xl px-4 py-3 transition ${
                    collapsed ? "justify-center gap-0" : "gap-3"
                  } ${
                    active
                      ? "bg-slate-100 text-slate-950"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                  title={link.label}
                  aria-label={link.label}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {!collapsed ? <span>{link.label}</span> : null}
                </Link>
              );
            })}
          </nav>

          {!collapsed ? (
            <div className="mt-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="text-xs uppercase tracking-wide text-slate-500">
                Chessactic
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Connect with players, chat, join clubs, and participate in the
                community forum.
              </p>
            </div>
          ) : (
            <div className="mt-auto flex justify-center">
              <div
                className="h-12 w-12 rounded-2xl border border-slate-800 bg-slate-950/60"
                title="Chessactic"
              />
            </div>
          )}
        </aside>

        <section className="min-w-0 flex-1 overflow-y-auto p-8">
          {children}
        </section>
      </div>
    </main>
  );
}