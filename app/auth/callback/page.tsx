import { Suspense } from "react";
import AuthCallbackClient from "./AuthCallbackClient";

export default function AuthCallbackPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 px-6 py-5 text-sm text-slate-300">
        <Suspense fallback={<span>Completing sign-in...</span>}>
          <AuthCallbackClient />
        </Suspense>
      </div>
    </main>
  );
}