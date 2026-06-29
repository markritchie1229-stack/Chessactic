"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowUpRight,
  Hash,
  MessageSquareMore,
  Search,
  Shield,
  UserCircle2,
  Users,
  X,
} from "lucide-react";

const socialItems = [
  { href: "/social/profile", label: "Profile", icon: UserCircle2 },
  { href: "/social/messages", label: "Messages", icon: MessageSquareMore },
  { href: "/social/friends", label: "Friends", icon: Users },
  { href: "/social/members", label: "Members", icon: Search },
  { href: "/social/clubs", label: "Clubs", icon: Shield },
  { href: "/social/forum", label: "Forum", icon: Hash },
] as const;

export function SocialRail() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const panel =
    open && mounted
      ? createPortal(
          <>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[60] bg-black/40"
              aria-label="Close social menu"
            />

            <aside className="fixed left-[88px] top-[104px] z-[70] w-[340px] max-w-[calc(100vw-112px)] max-h-[calc(100vh-128px)] overflow-y-auto overscroll-contain rounded-3xl border border-slate-800 bg-slate-900 p-5 shadow-2xl shadow-black/40">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm uppercase tracking-wide text-slate-400">
                    Social
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Jump to a section
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl p-1 text-slate-400 transition hover:bg-slate-800 hover:text-slate-100"
                  aria-label="Close social menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 grid gap-3">
                {socialItems.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-100 transition hover:bg-slate-800"
                    >
                      <span className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-slate-300" />
                        {item.label}
                      </span>
                      <ArrowUpRight className="h-4 w-4 text-slate-500" />
                    </Link>
                  );
                })}
              </div>
            </aside>
          </>,
          document.body,
        )
      : null;

  return (
    <div className="relative z-20">
      <div className="flex w-[72px] flex-col items-center rounded-3xl border border-slate-800 bg-slate-900/80 py-4 shadow-lg">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700 bg-slate-950 text-slate-100 transition hover:bg-slate-800"
          aria-label="Open social menu"
        >
          <MessageSquareMore className="h-6 w-6" />
        </button>
      </div>

      {panel}
    </div>
  );
}