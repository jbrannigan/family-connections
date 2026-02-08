"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Support redirect after login (e.g. from invite link)
  const redirectTo = searchParams.get("redirect") ?? "/dashboard";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        router.push(redirectTo);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (error) {
        setError(error.message);
      } else {
        router.push(redirectTo);
      }
    }
  }

  return (
    <div className="mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#0f1a14] p-8 text-white">
      <Link
        href="/"
        className="mb-8 flex items-center justify-center gap-3"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] text-xl">
          🌳
        </div>
        <span className="text-xl font-bold text-[#7fdb9a]">
          Family Connections
        </span>
      </Link>

      <h2 className="mb-2 text-center text-2xl font-bold">
        {mode === "signin" ? "Welcome back" : "Create account"}
      </h2>
      <p className="mb-6 text-center text-sm text-white/60">
        {mode === "signin"
          ? "Sign in to your account"
          : "Sign up with email and password"}
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          minLength={6}
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
        />

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] py-3 font-semibold text-[#0f1a14] transition hover:opacity-90 disabled:opacity-50"
        >
          {loading
            ? mode === "signin"
              ? "Signing in..."
              : "Creating account..."
            : mode === "signin"
              ? "Sign In"
              : "Create Account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-white/40">
        {mode === "signin" ? (
          <>
            Don&apos;t have an account?{" "}
            <button
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className="text-[#7fdb9a] hover:underline"
            >
              Sign up
            </button>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <button
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
              className="text-[#7fdb9a] hover:underline"
            >
              Sign in
            </button>
          </>
        )}
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1a472a] via-[#2d5a3d] to-[#1e3a28]">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
