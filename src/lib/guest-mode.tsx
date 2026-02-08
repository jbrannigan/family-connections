"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";

// ── PIN utilities ──────────────────────────────────────────

/**
 * Simple hash for PIN storage. This is NOT cryptographically secure —
 * it's a UI-level safety net to prevent accidental edits at reunions.
 * Server-side RLS remains the real security boundary.
 */
async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin + "family-connections-salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function getPinStorageKey(userId: string): string {
  return `guest_pin_${userId}_hash`;
}

// ── localStorage sync via useSyncExternalStore ─────────────

function subscribeToPinStorage(callback: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key?.startsWith("guest_pin_")) callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getServerSnapshot(): string | null {
  return null;
}

// ── Context ────────────────────────────────────────────────

interface GuestModeContextValue {
  /** Whether guest mode is currently active */
  isGuestMode: boolean;
  /** Whether a PIN has been set up */
  hasPin: boolean;
  /** Enter guest mode (turns on read-only UI) */
  enterGuestMode: () => void;
  /** Attempt to exit guest mode with the given PIN. Returns true if successful. */
  exitGuestMode: (pin: string) => Promise<boolean>;
  /** Set up or change the PIN. Returns true if the PIN was saved. */
  setupPin: (pin: string) => Promise<boolean>;
}

const GuestModeContext = createContext<GuestModeContextValue>({
  isGuestMode: false,
  hasPin: false,
  enterGuestMode: () => {},
  exitGuestMode: async () => false,
  setupPin: async () => false,
});

export function useGuestMode() {
  return useContext(GuestModeContext);
}

// ── Provider ───────────────────────────────────────────────

interface GuestModeProviderProps {
  userId: string;
  children: ReactNode;
}

export function GuestModeProvider({ userId, children }: GuestModeProviderProps) {
  const [isGuestMode, setIsGuestMode] = useState(false);

  // Read PIN hash from localStorage via useSyncExternalStore (no setState in effect)
  const pinStorageKey = getPinStorageKey(userId);
  const storedHash = useSyncExternalStore(
    subscribeToPinStorage,
    () => localStorage.getItem(pinStorageKey),
    getServerSnapshot,
  );

  const hasPin = storedHash !== null;

  const enterGuestMode = useCallback(() => {
    setIsGuestMode(true);
  }, []);

  const exitGuestMode = useCallback(
    async (pin: string): Promise<boolean> => {
      if (!storedHash) return false;
      const inputHash = await hashPin(pin);
      if (inputHash === storedHash) {
        setIsGuestMode(false);
        return true;
      }
      return false;
    },
    [storedHash],
  );

  const setupPin = useCallback(
    async (pin: string): Promise<boolean> => {
      if (pin.length !== 4 || !/^\d{4}$/.test(pin)) return false;
      const hash = await hashPin(pin);
      localStorage.setItem(pinStorageKey, hash);
      return true;
    },
    [pinStorageKey],
  );

  return (
    <GuestModeContext.Provider
      value={{
        isGuestMode,
        hasPin,
        enterGuestMode,
        exitGuestMode,
        setupPin,
      }}
    >
      {children}
    </GuestModeContext.Provider>
  );
}
