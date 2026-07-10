"use client";

import Link from "next/link";
import { Shield, ScrollText, Scale, Copyright } from "lucide-react";

const buttons = [
  { href: "/terms", label: "Terms", icon: ScrollText },
  { href: "/privacy", label: "Privacy", icon: Shield },
  { href: "/community-guidelines", label: "Guidelines", icon: Scale },
  { href: "/dmca", label: "Copyright", icon: Copyright },
];

export function LegalRail() {
  return (
    <div className="flex flex-col gap-3">
      {buttons.map((button) => {
        const Icon = button.icon;
        return (
          <Link
            key={button.href}
            href={button.href}
            title={button.label}
            className="group flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-slate-900/80 text-slate-300 transition-all duration-200 hover:scale-105 hover:border-amber-400 hover:text-amber-300 hover:shadow-lg hover:shadow-amber-500/20"
          >
            <Icon className="h-6 w-6" />
          </Link>
        );
      })}
    </div>
  );
}
