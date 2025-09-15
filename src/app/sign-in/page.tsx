// src/app/sign-in/page.tsx
"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function SignInPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    // NextAuth handles redirect on success
    const res = await signIn("credentials", {
      email,
      password,
      redirect: true,
      callbackUrl: "/"
    });

    // If res is undefined, NextAuth redirected; if it returns an object with error, show it
    if (res && (res as any).error) {
      setError("Invalid email or password");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl shadow-lg p-6">
        <h1 className="text-2xl font-semibold mb-4">Sign in to VibeScript</h1>

        <form onSubmit={onSubmit} className="space-y-3">
          <label className="block">
            <span className="text-sm">Email</span>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="mt-1 w-full rounded-xl border p-3"
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="text-sm">Password</span>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="mt-1 w-full rounded-xl border p-3"
              placeholder="••••••••"
              minLength={8}
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            disabled={loading}
            className="w-full rounded-xl p-3 border disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="my-4 text-center text-sm">or</div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            signIn("google", { callbackUrl: "/" });
          }}
        >
          <button className="w-full rounded-xl p-3 border">
            Continue with Google
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          No account?{" "}
          <Link href="/sign-up" className="underline">
            Create one
          </Link>
        </p>
      </div>
    </main>
  );
}
