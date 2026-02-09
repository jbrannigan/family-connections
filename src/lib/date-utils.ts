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
 * Validate a date input string and return a descriptive error message,
 * or null if the value is valid (or empty, since dates are optional).
 *
 * Goes beyond format checking to catch semantically invalid dates
 * like month 13 or day 32.
 */
export function validateDateInput(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null; // Empty is valid (dates are optional)

  // Check basic format first
  if (normalizeDate(trimmed) === null) {
    // Give a helpful hint based on what they typed
    if (/^\d{1,3}$/.test(trimmed)) {
      return "Year must be 4 digits (e.g. 1958)";
    }
    if (/^\d{4}-\d{1}$/.test(trimmed)) {
      return "Month must be 2 digits (e.g. 1958-03)";
    }
    if (/^\d{4}-\d{2}-\d{1}$/.test(trimmed)) {
      return "Day must be 2 digits (e.g. 1958-03-05)";
    }
    if (/\//.test(trimmed)) {
      return "Use hyphens, not slashes (e.g. 1958-03-15)";
    }
    return "Use format: YYYY, YYYY-MM, or YYYY-MM-DD";
  }

  // Format is valid — now check semantic validity
  const parts = trimmed.split("-");
  const year = parseInt(parts[0], 10);

  if (year < 1000 || year > 2100) {
    return "Year should be between 1000 and 2100";
  }

  if (parts.length >= 2) {
    const month = parseInt(parts[1], 10);
    if (month < 1 || month > 12) {
      return "Month must be between 01 and 12";
    }

    if (parts.length === 3) {
      const day = parseInt(parts[2], 10);
      // Simple max-day check per month (not accounting for leap years
      // since we're dealing with historical dates where precision varies)
      const maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
      if (day < 1 || day > maxDays[month - 1]) {
        return `Day must be between 01 and ${maxDays[month - 1]} for month ${parts[1]}`;
      }
    }
  }

  return null; // All good
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
