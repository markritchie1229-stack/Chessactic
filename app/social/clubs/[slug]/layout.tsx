import type { ReactNode } from "react";
import { notFound } from "next/navigation";

import { ClubLayout } from "../_components/ClubLayout";
import { getClubBySlug } from "../_lib/server-queries";
import type { ClubPageParams } from "../_lib/types";

type LayoutProps = {
  children: ReactNode;
  params: ClubPageParams;
};

export default async function ClubPageLayout({
  children,
  params,
}: LayoutProps) {
  const { slug } = await params;

  const club = await getClubBySlug(slug);

  if (!club) {
    notFound();
  }

  return (
    <ClubLayout
      club={club}
      active="club"
    >
      {children}
    </ClubLayout>
  );
}