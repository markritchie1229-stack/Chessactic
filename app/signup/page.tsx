"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function getAuthRedirectTo() {
  return `${window.location.origin}/auth/callback`;
}

export default function SignUpPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (mode === "signup") {
        const cleanUsername = username.trim().toLowerCase();
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanUsername) {
          setMessage("Please enter a username.");
          return;
        }

        if (!cleanEmail) {
          setMessage("Please enter your email.");
          return;
        }

        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            emailRedirectTo: getAuthRedirectTo(),
            data: {
              username: cleanUsername,
            },
          },
        });

        if (error) throw error;

        setMessage(
          "Your account has been created! Check your email and click the confirmation link."
        );
      } else {
        const rawLogin = loginIdentifier.trim();

        if (!rawLogin) {
          setMessage("Please enter your username or email.");
          return;
        }

        let emailToUse = rawLogin.toLowerCase();

        if (!rawLogin.includes("@")) {
          const { data, error } = await supabase.rpc(
            "get_email_by_username",
            {
              p_username: rawLogin.toLowerCase(),
            }
          );

          if (error) throw error;

          if (!data) {
            setMessage("That username was not found.");
            return;
          }

          emailToUse = (data as string).trim().toLowerCase();
        }

        const { error } = await supabase.auth.signInWithPassword({
          email: emailToUse,
          password,
        });

        if (error) throw error;

        router.push("/");
        router.refresh();
      }
    } catch (error: unknown) {
      const text =
        error instanceof Error ? error.message : "Something went wrong.";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async () => {
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail) {
      setMessage("Enter your email address first.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: cleanEmail,
        options: {
          emailRedirectTo: getAuthRedirectTo(),
        },
      });

      if (error) throw error;

      setMessage("Confirmation email sent. Check your inbox.");
    } catch (error: unknown) {
      const text =
        error instanceof Error
          ? error.message
          : "Unable to resend confirmation email.";
      setMessage(text);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-100">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <h1 className="text-3xl font-semibold">
          {mode === "signup" ? "Create Account" : "Log In"}
        </h1>

        <p className="mt-2 text-sm text-slate-400">
          Save your puzzle progress, statistics, ratings, and streaks.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === "signup" ? (
            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm text-slate-300"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="chessmaster99"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
              />
            </div>
          ) : (
            <div>
              <label
                htmlFor="loginIdentifier"
                className="mb-2 block text-sm text-slate-300"
              >
                Username or Email
              </label>
              <input
                id="loginIdentifier"
                type="text"
                required
                autoComplete="username"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                placeholder="chessmaster99 or you@example.com"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
              />
            </div>
          )}

          {mode === "signup" ? (
            <div>
              <label htmlFor="email" className="mb-2 block text-sm text-slate-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
              />
            </div>
          ) : null}

          <div>
            <label htmlFor="password" className="mb-2 block text-sm text-slate-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-slate-100 outline-none placeholder:text-slate-500 focus:border-slate-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-slate-100 px-4 py-3 font-medium text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Working..." : mode === "signup" ? "Create Account" : "Log In"}
          </button>
        </form>

        {mode === "signup" ? (
          <button
            type="button"
            onClick={resendConfirmation}
            disabled={loading || !email}
            className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-medium text-slate-100 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Resend Confirmation Email
          </button>
        ) : null}

        {message ? (
          <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-slate-300">
            {message}
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setMessage("");
          }}
          className="mt-4 text-sm text-slate-400 underline underline-offset-4 hover:text-slate-200"
        >
          {mode === "signup"
            ? "Already have an account? Log In"
            : "Need an account? Create one"}
        </button>
      </div>
    </main>
  );
}