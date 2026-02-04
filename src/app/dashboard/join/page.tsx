"use client";

import { useState } from "react";
import { joinGraph } from "../actions";
import Link from "next/link";

export default function JoinGraphPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      await joinGraph(formData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a1410] text-white">
      <header className="border-b border-white/10 bg-[#0f1a14]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] text-lg">
              🌳
            </div>
            <span className="text-lg font-bold text-[#7fdb9a]">
              Family Connections
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-lg px-6 py-12">
        <h1 className="mb-2 text-3xl font-bold">Join Family Graph</h1>
        <p className="mb-8 text-white/50">
          Enter the invite code shared by a family member.
        </p>

        <form action={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label
              htmlFor="code"
              className="mb-2 block text-sm font-medium text-white/70"
            >
              Invite Code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              placeholder="e.g. a1b2c3d4e5f6"
              required
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 font-mono text-lg tracking-wider text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-8 py-3 font-semibold text-[#0f1a14] transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Joining..." : "Join Graph"}
            </button>
            <Link
              href="/dashboard"
              className="rounded-xl border border-white/20 px-8 py-3 font-semibold transition hover:bg-white/5"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
