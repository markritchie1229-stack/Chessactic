import { Suspense } from "react";
import SignUpClient from "./SignUpClient";

export default function SignUpPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <SignUpClient />
    </Suspense>
  );
}