import type { Person } from "@/types/database";

/**
 * Parsed name parts extracted from a display_name string.
 */
export interface ParsedDisplayName {
  givenName: string;
  nickname: string | null;
  surname: string | null;
}

/**
 * Structured name parts for rendering, using database columns with
 * fallback to parsing display_name.
 */
export interface DisplayParts {
  /** The name to show prominently — preferred_name, given_name, or first word of display_name */
  primaryName: string;
  /** Nickname if available (e.g., "Peggy") */
  nickname: string | null;
  /** Full display name for reference */
  fullName: string;
}

/**
 * Parse a display_name string to extract given name, nickname, and surname.
 *
 * Handles patterns like:
 *   "Margaret (Peggy) McGinty"  -> { givenName: "Margaret", nickname: "Peggy", surname: "McGinty" }
 *   "Margaret (Peggy McGinty"   -> { givenName: "Margaret", nickname: "Peggy", surname: "McGinty" }
 *   "James Brannigan"           -> { givenName: "James", nickname: null, surname: "Brannigan" }
 *   "John Daniel McGinty Jr"    -> { givenName: "John", nickname: null, surname: "Daniel McGinty Jr" }
 *   "Margaret Agnes McGinty"    -> { givenName: "Margaret", nickname: null, surname: "Agnes McGinty" }
 */
export function parseDisplayName(displayName: string): ParsedDisplayName {
  const trimmed = displayName.trim();
  if (!trimmed) {
    return { givenName: "", nickname: null, surname: null };
  }

  // Try to extract nickname from parentheses: "Margaret (Peggy) McGinty" or "Margaret (Peggy McGinty"
  const nicknameMatch = trimmed.match(/^(\S+)\s+\(([A-Z][a-z]{1,15})(?:\)|(?=\s|$))/);

  if (nicknameMatch) {
    const givenName = nicknameMatch[1];
    const nickname = nicknameMatch[2];

    // Get the rest after the nickname pattern
    const afterNickname = trimmed
      .replace(nicknameMatch[0], "")
      .replace(/^\)?\s*/, "")
      .trim();

    return {
      givenName,
      nickname,
      surname: afterNickname || null,
    };
  }

  // No nickname — split into given name + rest
  const parts = trimmed.split(/\s+/);
  return {
    givenName: parts[0],
    nickname: null,
    surname: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}

/**
 * Get structured display parts for a person, using database columns
 * with fallback to parsing display_name.
 */
export function getDisplayParts(person: Person): DisplayParts {
  const primaryName =
    person.preferred_name ||
    person.given_name ||
    parseDisplayName(person.display_name).givenName ||
    person.display_name;

  const nickname =
    person.nickname || parseDisplayName(person.display_name).nickname;

  return {
    primaryName,
    nickname,
    fullName: person.display_name,
  };
}
