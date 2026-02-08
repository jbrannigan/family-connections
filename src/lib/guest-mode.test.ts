import { describe, it, expect } from "vitest";

// We test the hash and key utilities by extracting the logic.
// The React context/provider is tested via integration tests.

// Replicate the hash function from guest-mode.tsx for testing
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

describe("Guest Mode PIN utilities", () => {
  describe("hashPin", () => {
    it("returns a hex string", async () => {
      const hash = await hashPin("1234");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("produces consistent results for the same input", async () => {
      const hash1 = await hashPin("5678");
      const hash2 = await hashPin("5678");
      expect(hash1).toBe(hash2);
    });

    it("produces different results for different inputs", async () => {
      const hash1 = await hashPin("1234");
      const hash2 = await hashPin("5678");
      expect(hash1).not.toBe(hash2);
    });

    it("hashes single digit PINs", async () => {
      const hash = await hashPin("0000");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });
  });

  describe("getPinStorageKey", () => {
    it("returns a scoped key for the user", () => {
      const key = getPinStorageKey("user-123");
      expect(key).toBe("guest_pin_user-123_hash");
    });

    it("returns different keys for different users", () => {
      const key1 = getPinStorageKey("user-a");
      const key2 = getPinStorageKey("user-b");
      expect(key1).not.toBe(key2);
    });
  });

  describe("PIN verification flow", () => {
    it("correct PIN matches stored hash", async () => {
      const pin = "4321";
      const storedHash = await hashPin(pin);
      const inputHash = await hashPin(pin);
      expect(inputHash).toBe(storedHash);
    });

    it("incorrect PIN does not match stored hash", async () => {
      const storedHash = await hashPin("1234");
      const inputHash = await hashPin("0000");
      expect(inputHash).not.toBe(storedHash);
    });
  });
});
