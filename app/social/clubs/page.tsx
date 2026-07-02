"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeInfo,
  ImagePlus,
  Search,
  Shield,
  Sparkles,
  Users,
  Wallpaper,
} from "lucide-react";

type Club = {
  name: string;
  slug: string;
  meta: string;
  desc: string;
  leader: string;
  background: string;
  picture: string;
  members: number;
};

const profaneWords = ["badword", "curse", "profanity", "swear"].map((word) => word.toLowerCase());

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function SocialClubsPage() {
  const [search, setSearch] = useState("");
  const [clubs, setClubs] = useState<Club[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pictureName, setPictureName] = useState("No image selected");
  const [backgroundName, setBackgroundName] = useState("No background selected");
  const [error, setError] = useState("");
  const [showCreateFlow, setShowCreateFlow] = useState(false);

  const filteredClubs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return clubs;

    return clubs.filter((club) => {
      return (
        club.name.toLowerCase().includes(query) ||
        club.desc.toLowerCase().includes(query) ||
        club.leader.toLowerCase().includes(query)
      );
    });
  }, [clubs, search]);

  const handleCreateClub = () => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      setError("Please enter a club title.");
      return;
    }

    const hasProfanity = profaneWords.some((word) => trimmedTitle.toLowerCase().includes(word));
    if (hasProfanity) {
      setError("Not appropriate");
      return;
    }

    const slug = slugify(trimmedTitle);

    setError("");
    setClubs((current) => [
      {
        name: trimmedTitle,
        slug,
        meta: "1 member",
        desc: description.trim() || "A newly created club.",
        leader: "You",
        background: backgroundName,
        picture: pictureName,
        members: 1,
      },
      ...current,
    ]);

    setTitle("");
    setDescription("");
    setPictureName("No image selected");
    setBackgroundName("No background selected");
    setShowCreateFlow(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="mb-6 flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-sm uppercase tracking-[0.28em] text-slate-400">Social</div>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Clubs</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
              Browse clubs here. All club-only content lives on each individual club page, just
              like Chess.com.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCreateFlow(true)}
            className="inline-flex h-fit items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Create New Club
            <ArrowRight className="h-4 w-4" />
          </button>
        </header>

        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.9fr]">
          <main className="space-y-6">
            <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold">Club list</h2>
                  <p className="text-sm text-slate-400">
                    Search clubs, open a club page, or create a new club.
                  </p>
                </div>
                <div className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-400">
                  {filteredClubs.length} clubs
                </div>
              </div>

              <div className="relative mb-5">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search clubs"
                  className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 py-3 pl-11 pr-4 text-sm text-slate-100 outline-none placeholder:text-slate-500 focus:border-cyan-500"
                />
              </div>

              {filteredClubs.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-sm text-slate-400">
                  No clubs yet. Create the first club to get started.
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredClubs.map((club) => (
                    <Link
                      key={club.slug}
                      href={`/clubs/${club.slug}`}
                      className="group block rounded-2xl border border-slate-800 bg-slate-950/60 p-4 transition hover:border-cyan-500/40 hover:bg-slate-950"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-100 group-hover:text-cyan-300">
                              {club.name}
                            </span>
                            <Shield className="h-4 w-4 text-slate-500" />
                          </div>
                          <div className="text-sm text-slate-500">
                            {club.meta} · Leader: {club.leader}
                          </div>
                        </div>

                        <div className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-400">
                          Open club page
                        </div>
                      </div>

                      <p className="mt-3 text-sm leading-6 text-slate-300">{club.desc}</p>
                      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
                        <span className="rounded-full bg-slate-900 px-3 py-1">
                          Background: {club.background}
                        </span>
                        <span className="rounded-full bg-slate-900 px-3 py-1">
                          Picture: {club.picture}
                        </span>
                        <span className="rounded-full bg-slate-900 px-3 py-1">
                          Members: {club.members}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </main>

          <aside className="space-y-6">
            {showCreateFlow ? (
              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
                <div className="mb-4 flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-cyan-400" />
                  <div>
                    <h2 className="text-xl font-semibold">Create a new club</h2>
                    <p className="text-sm text-slate-400">
                      Fill out the club details to continue.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Club title</label>
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Enter club title"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm text-slate-300">Club description</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Write a short club description"
                      rows={4}
                      className="w-full rounded-2xl border border-slate-700 bg-slate-950/80 px-4 py-3 text-sm outline-none placeholder:text-slate-500 focus:border-cyan-500"
                    />
                  </div>

                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
                      <ImagePlus className="h-4 w-4 text-cyan-400" />
                      Club picture
                    </div>
                    <input
                      type="file"
                      onChange={(e) => setPictureName(e.target.files?.[0]?.name ?? "No image selected")}
                      className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-slate-100 hover:file:bg-slate-700"
                    />
                    <div className="mt-2 text-xs text-slate-500">Selected: {pictureName}</div>
                  </div>

                  <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-4">
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
                      <Wallpaper className="h-4 w-4 text-cyan-400" />
                      Club background
                    </div>
                    <input
                      type="file"
                      onChange={(e) =>
                        setBackgroundName(e.target.files?.[0]?.name ?? "No background selected")
                      }
                      className="block w-full text-sm text-slate-400 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-800 file:px-4 file:py-2 file:text-slate-100 hover:file:bg-slate-700"
                    />
                    <div className="mt-2 text-xs text-slate-500">Selected: {backgroundName}</div>
                  </div>

                  {error ? (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                      {error}
                    </div>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleCreateClub}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                  >
                    Continue
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </section>
            ) : (
              <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
                <div className="mb-4 flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-cyan-400" />
                  <div>
                    <h2 className="text-xl font-semibold">Create a new club</h2>
                    <p className="text-sm text-slate-400">
                      Start the club creation flow from here.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowCreateFlow(true)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Create New Club
                  <ArrowRight className="h-4 w-4" />
                </button>
              </section>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
