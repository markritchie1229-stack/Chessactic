import { notFound } from "next/navigation";

import ClubSettingsGate from "./_components/ClubSettingsGate";
import { getClubBySlug } from "../../_lib/server-queries";
import type { ClubPageParams } from "../../_lib/types";

type PageProps = {
  params: ClubPageParams;
};

export default async function ClubSettingsPage({
  params,
}: PageProps) {
  const { slug } = await params;

  const club = await getClubBySlug(slug);

  if (!club) {
    notFound();
  }

  return (
    <ClubSettingsGate
      clubId={club.id}
      clubSlug={slug}
      club={club}
    />
  );
}