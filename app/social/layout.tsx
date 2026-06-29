"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
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

export default function SocialLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl">

        {/* Sidebar */}

        <aside className="sticky top-0 flex h-screen w-72 flex-col border-r border-slate-800 bg-slate-900/90 p-6">

          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Chessactic
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-bold">
              Social
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Community features
            </p>
          </div>

          <nav className="space-y-2">

            {links.map((link) => {
              const Icon = link.icon;

              const active = pathname === link.href;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition ${
                    active
                      ? "bg-slate-100 text-slate-950"
                      : "text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Link>
              );
            })}

          </nav>

          <div className="mt-auto rounded-2xl border border-slate-800 bg-slate-950/60 p-4">

            <div className="text-xs uppercase tracking-wide text-slate-500">
              Chessactic
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Connect with players, chat, join clubs, and participate in the
              community forum.
            </p>

          </div>

        </aside>

        {/* Main */}

        <section className="flex-1 overflow-y-auto p-8">
          {children}
        </section>

      </div>
    </main>
  );
}