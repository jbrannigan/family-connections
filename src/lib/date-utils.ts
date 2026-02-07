/**
 * Date utilities for ISO 8601 reduced precision dates.
 *
 * The app stores dates as text supporting three precision levels:
 * - Year only: "1958"
 * - Year and month: "1958-03"
 * - Full date: "1958-03-15"
 */

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Normalize a date string for database storage.
 * Accepts year-only, year-month, or full ISO date.
 * Returns the trimmed valid string, or null if invalid/empty.
 */
export function normalizeDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;
  // Year only: "1958"
  if (/^\d{4}$/.test(trimmed)) return trimmed;
  // Year and month: "1958-03"
  if (/^\d{4}-\d{2}$/.test(trimmed)) return trimmed;
  // Full date: "1958-03-15"
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return null;
}

/**
 * Check if a date string is a valid ISO 8601 reduced precision date.
 */
export function isValidDate(dateStr: string): boolean {
  return normalizeDate(dateStr) !== null;
}

/**
 * Format a date string for human-readable display.
 * "1958" → "1958"
 * "1958-03" → "March 1958"
 * "1958-03-15" → "March 15, 1958"
 */
export function formatDateForDisplay(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split("-");

  if (parts.length === 1) {
    return parts[0]; // year only
  }

  if (parts.length === 2) {
    const monthIndex = parseInt(parts[1], 10) - 1;
    const monthName = MONTH_NAMES[monthIndex] ?? parts[1];
    return `${monthName} ${parts[0]}`;
  }

  if (parts.length === 3) {
    const monthIndex = parseInt(parts[1], 10) - 1;
    const monthName = MONTH_NAMES[monthIndex] ?? parts[1];
    const day = parseInt(parts[2], 10);
    return `${monthName} ${day}, ${parts[0]}`;
  }

  return dateStr;
}

/**
 * Format an ISO timestamp as a relative time string.
 * "just now", "5 minutes ago", "3 days ago", etc.
 * Falls back to a formatted absolute date for anything older than 30 days.
 */
export function formatRelativeTime(isoTimestamp: string): string {
  const now = Date.now();
  const then = new Date(isoTimestamp).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  if (diffDay < 30) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;

  const d = new Date(isoTimestamp);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
