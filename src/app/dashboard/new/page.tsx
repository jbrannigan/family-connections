"use client";

import { useState } from "react";
import { createGraph } from "../actions";
import Link from "next/link";

export default function NewGraphPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    try {
      await createGraph(formData);
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
        <h1 className="mb-8 text-3xl font-bold">Create Family Graph</h1>

        <form action={handleSubmit} className="flex flex-col gap-6">
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-medium text-white/70"
            >
              Graph Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder='e.g. "The Brannigan Family"'
              required
              className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
            />
          </div>

          {error && <p className="text-sm text-red-400">{error}</p>}

          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-8 py-3 font-semibold text-[#0f1a14] transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Creating..." : "Create Graph"}
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
