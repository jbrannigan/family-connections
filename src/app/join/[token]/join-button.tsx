"use client";

import { useState } from "react";
import { joinGraphViaInviteLink } from "@/app/dashboard/actions";

export default function JoinButton({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleJoin() {
    setLoading(true);
    setError(null);
    try {
      await joinGraphViaInviteLink(token);
      // The server action redirects on success
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to join");
      setLoading(false);
    }
  }

  return (
    <div>
      {error && (
        <div className="mb-3 rounded-xl bg-red-500/10 px-4 py-3 text-center text-sm text-red-400">
          {error}
        </div>
      )}
      <button
        onClick={handleJoin}
        disabled={loading}
        className="w-full rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] py-3 font-semibold text-[#0f1a14] transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Joining..." : "Join Graph"}
      </button>
    </div>
  );
}
