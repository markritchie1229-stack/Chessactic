import type { ReactNode } from "react";
import type { ClubRecord } from "../_lib/types";
import { ClubHeader } from "./ClubHeader";
import { ClubQuickLinks } from "./ClubQuickLinks";

type ClubLayoutProps = {
  club: ClubRecord;
  children: ReactNode;
  activeSection?: "club" | "members" | "invite" | "forum" | "settings";
};

export function ClubLayout({
  club,
  children,
  activeSection = "club",
}: ClubLayoutProps) {
  const backgroundStyle = club.banner_url
    ? { backgroundImage: `url(${club.banner_url})` }
    : undefined;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div
        className="min-h-screen bg-cover bg-center bg-no-repeat"
        style={backgroundStyle}
      >
        <div className="min-h-screen bg-slate-950/80">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-5 flex items-center justify-between gap-3">
              <ClubQuickLinks
                base={`/social/clubs/${club.title_search}`}
                active={activeSection}
              />
            </div>

            <ClubHeader club={club} />

            <div className="mt-6">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}