import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { CreateClubForm } from "../_components/CreateClubForm";

export default function CreateClubPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Link
            href="/social/clubs"
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-800 bg-slate-900 px-4 py-2 text-sm text-slate-200 transition hover:border-cyan-500/60 hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to clubs
          </Link>
        </div>

        <CreateClubForm />
      </div>
    </div>
  );
}