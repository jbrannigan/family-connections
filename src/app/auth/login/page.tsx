"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#1a472a] via-[#2d5a3d] to-[#1e3a28]">
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

        {sent ? (
          <div className="text-center">
            <div className="mb-4 text-4xl">📧</div>
            <h2 className="mb-2 text-xl font-semibold">Check your email</h2>
            <p className="text-sm text-white/60">
              We sent a magic link to <strong>{email}</strong>. Click the link
              to sign in.
            </p>
          </div>
        ) : (
          <>
            <h2 className="mb-2 text-center text-2xl font-bold">
              Welcome back
            </h2>
            <p className="mb-6 text-center text-sm text-white/60">
              Sign in with a magic link — no password needed
            </p>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
              />

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] py-3 font-semibold text-[#0f1a14] transition hover:opacity-90 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Magic Link"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
