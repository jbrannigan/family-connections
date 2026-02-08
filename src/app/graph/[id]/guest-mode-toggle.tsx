"use client";

import { useState, useRef, useEffect } from "react";
import { useGuestMode } from "@/lib/guest-mode";

type DialogMode = null | "setup" | "exit";

export default function GuestModeToggle() {
  const { isGuestMode, hasPin, enterGuestMode, exitGuestMode, setupPin } =
    useGuestMode();

  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus the PIN input when dialog opens
  useEffect(() => {
    if (dialogMode) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [dialogMode]);

  function handleToggleClick() {
    if (isGuestMode) {
      // Open exit dialog
      setDialogMode("exit");
      setPin("");
      setError(null);
    } else if (hasPin) {
      // Already has a PIN — just enter guest mode
      enterGuestMode();
    } else {
      // No PIN set — open setup dialog
      setDialogMode("setup");
      setPin("");
      setConfirmPin("");
      setError(null);
    }
  }

  async function handleSetupPin() {
    setError(null);

    if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits");
      return;
    }
    if (pin !== confirmPin) {
      setError("PINs don't match");
      return;
    }

    setLoading(true);
    const ok = await setupPin(pin);
    setLoading(false);

    if (ok) {
      setDialogMode(null);
      enterGuestMode();
    } else {
      setError("Failed to save PIN");
    }
  }

  async function handleExitGuest() {
    setError(null);

    if (pin.length !== 4) {
      setError("Enter your 4-digit PIN");
      return;
    }

    setLoading(true);
    const ok = await exitGuestMode(pin);
    setLoading(false);

    if (ok) {
      setDialogMode(null);
    } else {
      setError("Incorrect PIN");
      setPin("");
      inputRef.current?.focus();
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) {
      setDialogMode(null);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      if (dialogMode === "setup") handleSetupPin();
      if (dialogMode === "exit") handleExitGuest();
    }
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={handleToggleClick}
        className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
          isGuestMode
            ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
            : "border border-white/20 text-white/50 hover:bg-white/5 hover:text-white/70"
        }`}
        title={isGuestMode ? "Exit Guest Mode" : "Enter Guest Mode"}
      >
        {isGuestMode ? "Exit Guest Mode" : "Guest Mode"}
      </button>

      {/* Dialog */}
      {dialogMode && (
        <div
          ref={backdropRef}
          onClick={handleBackdropClick}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          <div
            className="mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[#0f1a14] p-6 text-white shadow-2xl"
            onKeyDown={handleKeyDown}
          >
            {dialogMode === "setup" ? (
              <>
                <div className="mb-4 text-center">
                  <div className="mb-2 text-3xl">🔐</div>
                  <h3 className="text-lg font-bold">Set Up Guest PIN</h3>
                  <p className="mt-1 text-sm text-white/40">
                    Create a 4-digit PIN to lock Guest Mode. You&apos;ll
                    need this PIN to exit and restore edit controls.
                  </p>
                </div>

                <div className="mb-3">
                  <label className="mb-1 block text-xs text-white/40">
                    PIN
                  </label>
                  <input
                    ref={inputRef}
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) =>
                      setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    placeholder="••••"
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder:text-white/20 focus:border-[#7fdb9a] focus:outline-none"
                  />
                </div>

                <div className="mb-4">
                  <label className="mb-1 block text-xs text-white/40">
                    Confirm PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={confirmPin}
                    onChange={(e) =>
                      setConfirmPin(
                        e.target.value.replace(/\D/g, "").slice(0, 4),
                      )
                    }
                    placeholder="••••"
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder:text-white/20 focus:border-[#7fdb9a] focus:outline-none"
                  />
                </div>

                {error && (
                  <p className="mb-3 text-center text-sm text-red-400">
                    {error}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleSetupPin}
                    disabled={loading || pin.length !== 4}
                    className="flex-1 rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] py-3 font-semibold text-[#0f1a14] transition hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Set PIN & Enter Guest Mode"}
                  </button>
                  <button
                    onClick={() => setDialogMode(null)}
                    className="rounded-xl border border-white/20 px-4 py-3 font-semibold transition hover:bg-white/5"
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="mb-4 text-center">
                  <div className="mb-2 text-3xl">🔓</div>
                  <h3 className="text-lg font-bold">Exit Guest Mode</h3>
                  <p className="mt-1 text-sm text-white/40">
                    Enter your 4-digit PIN to restore edit controls.
                  </p>
                </div>

                <div className="mb-4">
                  <input
                    ref={inputRef}
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={pin}
                    onChange={(e) =>
                      setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                    placeholder="••••"
                    className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-center text-2xl tracking-[0.5em] text-white placeholder:text-white/20 focus:border-[#7fdb9a] focus:outline-none"
                  />
                </div>

                {error && (
                  <p className="mb-3 text-center text-sm text-red-400">
                    {error}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={handleExitGuest}
                    disabled={loading || pin.length !== 4}
                    className="flex-1 rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] py-3 font-semibold text-[#0f1a14] transition hover:opacity-90 disabled:opacity-50"
                  >
                    {loading ? "Verifying..." : "Exit Guest Mode"}
                  </button>
                  <button
                    onClick={() => setDialogMode(null)}
                    className="rounded-xl border border-white/20 px-4 py-3 font-semibold transition hover:bg-white/5"
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
