import { Shield } from "lucide-react";
import { SocialPageShell } from "../_components/SocialPageShell";

const clubs = [
  {
    name: "Tactical Tuesdays",
    meta: "248 members",
    desc: "Weekly tactics battles and analysis.",
  },
  {
    name: "Endgame Lab",
    meta: "91 members",
    desc: "King, pawn, and rook endgames.",
  },
  {
    name: "Weekend Blitzers",
    meta: "1.2k members",
    desc: "Fast games, ladders, and arenas.",
  },
];

export default function SocialClubsPage() {
  return (
    <SocialPageShell title="Clubs" subtitle="Community groups and chess hangouts.">
      <div className="space-y-3">
        {clubs.map((club) => (
          <div
            key={club.name}
            className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-medium text-slate-100">{club.name}</div>
                <div className="text-sm text-slate-500">{club.meta}</div>
              </div>
              <Shield className="h-5 w-5 text-slate-500" />
            </div>
            <div className="mt-3 text-sm leading-6 text-slate-300">{club.desc}</div>
          </div>
        ))}
      </div>
    </SocialPageShell>
  );
}