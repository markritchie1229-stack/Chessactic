import { Suspense } from "react";
import AdminModerationPage from "./AdminModerationPage";

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-slate-400">
          Loading moderation panel...
        </div>
      }
    >
      <AdminModerationPage />
    </Suspense>
  );
}