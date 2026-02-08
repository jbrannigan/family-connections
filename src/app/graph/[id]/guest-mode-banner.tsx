"use client";

import { useGuestMode } from "@/lib/guest-mode";

export default function GuestModeBanner() {
  const { isGuestMode } = useGuestMode();

  if (!isGuestMode) return null;

  return (
    <div className="border-b border-amber-500/20 bg-amber-500/10 px-6 py-2 text-center text-sm font-medium text-amber-400">
      Guest Mode — Read Only
    </div>
  );
}
