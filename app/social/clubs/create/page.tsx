import { CreateClubForm } from "../_components/CreateClubForm";

export default function CreateClubPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-3xl border border-slate-800 bg-slate-900/80 p-6 shadow-2xl shadow-black/20">
          <div className="text-sm uppercase tracking-[0.28em] text-slate-400">
            Social
          </div>

          <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
            Create Club
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Start your own club. You can customize its name, description,
            avatar, and banner now, and change them later from the club
            settings page.
          </p>
        </header>

        <CreateClubForm />
      </div>
    </div>
  );
}