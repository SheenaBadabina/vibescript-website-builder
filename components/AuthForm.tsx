// components/AuthForm.tsx
// Mobile-first sign-in / sign-up form with Terms & Privacy links wired up.
// If you already have a different auth system, you can replace its form block with this entire file.

"use client";

import { useState } from "react";
import Link from "next/link";

type Mode = "signin" | "signup";

export default function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // TODO: Integrate with your real auth API or next-auth actions.
      // This is a placeholder action to keep the component drop-in ready.
      await new Promise((res) => setTimeout(res, 600));
      // After successful auth, redirect as needed:
      // router.push("/dashboard");
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function onGoogle() {
    setLoading(true);
    setError(null);
    try {
      // TODO: Replace with your Google OAuth trigger
      await new Promise((res) => setTimeout(res, 600));
    } catch (err: any) {
      setError(err?.message ?? "Google sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md p-4 sm:p-6">
      <div className="rounded-2xl border border-white/10 bg-[rgb(13,17,23)]/40 p-6 shadow-xl backdrop-blur md:p-8 dark:bg-black/30">
        <h1 className="mb-1 text-2xl font-bold text-white">VibeScript Builder</h1>
        <p className="mb-6 text-sm text-gray-300">
          {mode === "signin"
            ? "Sign in with email/password or continue with Google."
            : "Create your account with email/password or continue with Google."}
        </p>

        {error && (
          <div className="mb-4 rounded-md border border-red-400/40 bg-red-500/10 p-2 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="email" className="block text-xs font-medium text-gray-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:border-teal-400 focus:outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="password" className="block text-xs font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-400 focus:border-teal-400 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-pink-500 via-yellow-400 to-teal-400 px-4 py-2 text-sm font-semibold text-black transition-opacity disabled:opacity-60"
          >
            {loading ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>

          <button
            type="button"
            disabled={loading}
            onClick={onGoogle}
            className="inline-flex w-full items-center justify-center rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
          >
            Continue with Google
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-gray-400">
          {mode === "signin" ? (
            <>
              Don&apos;t have an account?{" "}
              <button
                onClick={() => setMode("signup")}
                className="underline underline-offset-2 hover:text-gray-200"
              >
                Create account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setMode("signin")}
                className="underline underline-offset-2 hover:text-gray-200"
              >
                Sign in
              </button>
            </>
          )}
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed text-gray-400">
          By continuing you agree to our{" "}
          <Link
            href="/terms"
            className="underline underline-offset-2 hover:text-gray-200"
          >
            terms
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-gray-200"
          >
            privacy policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
            }
