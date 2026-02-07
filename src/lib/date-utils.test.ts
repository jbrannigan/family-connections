import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  normalizeDate,
  isValidDate,
  formatDateForDisplay,
  formatRelativeTime,
} from "./date-utils";

describe("normalizeDate", () => {
  it("returns null for null input", () => {
    expect(normalizeDate(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeDate("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(normalizeDate("   ")).toBeNull();
  });

  it("accepts year-only format", () => {
    expect(normalizeDate("1958")).toBe("1958");
  });

  it("accepts year-month format", () => {
    expect(normalizeDate("1958-03")).toBe("1958-03");
  });

  it("accepts full date format", () => {
    expect(normalizeDate("1958-03-15")).toBe("1958-03-15");
  });

  it("trims whitespace", () => {
    expect(normalizeDate("  1958  ")).toBe("1958");
    expect(normalizeDate(" 1958-03 ")).toBe("1958-03");
  });

  it("rejects invalid formats", () => {
    expect(normalizeDate("March 1958")).toBeNull();
    expect(normalizeDate("1958/03/15")).toBeNull();
    expect(normalizeDate("03-15-1958")).toBeNull();
    expect(normalizeDate("abc")).toBeNull();
    expect(normalizeDate("19")).toBeNull();
    expect(normalizeDate("1958-3")).toBeNull(); // month must be 2 digits
  });
});

describe("isValidDate", () => {
  it("returns true for valid formats", () => {
    expect(isValidDate("1958")).toBe(true);
    expect(isValidDate("1958-03")).toBe(true);
    expect(isValidDate("1958-03-15")).toBe(true);
  });

  it("returns false for invalid formats", () => {
    expect(isValidDate("abc")).toBe(false);
    expect(isValidDate("1958/03")).toBe(false);
  });
});

describe("formatDateForDisplay", () => {
  it("returns null for null input", () => {
    expect(formatDateForDisplay(null)).toBeNull();
  });

  it("returns year for year-only input", () => {
    expect(formatDateForDisplay("1958")).toBe("1958");
  });

  it("returns month and year for year-month input", () => {
    expect(formatDateForDisplay("1958-03")).toBe("March 1958");
  });

  it("formats all months correctly", () => {
    expect(formatDateForDisplay("2000-01")).toBe("January 2000");
    expect(formatDateForDisplay("2000-06")).toBe("June 2000");
    expect(formatDateForDisplay("2000-12")).toBe("December 2000");
  });

  it("returns full formatted date for complete input", () => {
    expect(formatDateForDisplay("1958-03-15")).toBe("March 15, 1958");
  });

  it("handles single-digit days correctly", () => {
    expect(formatDateForDisplay("1958-03-01")).toBe("March 1, 1958");
  });
});

describe("formatRelativeTime", () => {
  const NOW = new Date("2026-02-07T12:00:00Z").getTime();

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for timestamps less than a minute ago', () => {
    const tenSecondsAgo = new Date(NOW - 10_000).toISOString();
    expect(formatRelativeTime(tenSecondsAgo)).toBe("just now");
  });

  it("returns singular minute", () => {
    const oneMinuteAgo = new Date(NOW - 60_000).toISOString();
    expect(formatRelativeTime(oneMinuteAgo)).toBe("1 minute ago");
  });

  it("returns plural minutes", () => {
    const fiveMinutesAgo = new Date(NOW - 5 * 60_000).toISOString();
    expect(formatRelativeTime(fiveMinutesAgo)).toBe("5 minutes ago");
  });

  it("returns singular hour", () => {
    const oneHourAgo = new Date(NOW - 3_600_000).toISOString();
    expect(formatRelativeTime(oneHourAgo)).toBe("1 hour ago");
  });

  it("returns plural hours", () => {
    const threeHoursAgo = new Date(NOW - 3 * 3_600_000).toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe("3 hours ago");
  });

  it("returns singular day", () => {
    const oneDayAgo = new Date(NOW - 86_400_000).toISOString();
    expect(formatRelativeTime(oneDayAgo)).toBe("1 day ago");
  });

  it("returns plural days", () => {
    const fiveDaysAgo = new Date(NOW - 5 * 86_400_000).toISOString();
    expect(formatRelativeTime(fiveDaysAgo)).toBe("5 days ago");
  });

  it("returns formatted date for timestamps older than 30 days", () => {
    const sixtyDaysAgo = new Date(NOW - 60 * 86_400_000).toISOString();
    const result = formatRelativeTime(sixtyDaysAgo);
    // Should be an absolute date like "Dec 9, 2025"
    expect(result).toMatch(/\w{3} \d{1,2}, \d{4}/);
  });
});
