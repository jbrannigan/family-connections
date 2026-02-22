/**
 * Search utility for filtering persons by name fields.
 *
 * Searches display_name, nickname, given_name, and preferred_name.
 * Uses case-insensitive substring matching with match range tracking
 * for highlighting on display_name. Prefix matches are sorted first.
 */

import type { Person } from "@/types/database";

export interface PersonSearchResult {
  person: Person;
  matchRanges: Array<{ start: number; end: number }>;
  /** When the match is on a field other than display_name, indicates which field matched */
  matchedField?: "nickname" | "given_name" | "preferred_name";
}

/**
 * Find all substring match ranges for a query within a string.
 */
function findMatchRanges(
  text: string,
  lowerQuery: string,
  queryLength: number,
): Array<{ start: number; end: number }> {
  const lower = text.toLowerCase();
  const ranges: Array<{ start: number; end: number }> = [];
  let searchFrom = 0;
  while (searchFrom < lower.length) {
    const idx = lower.indexOf(lowerQuery, searchFrom);
    if (idx === -1) break;
    ranges.push({ start: idx, end: idx + queryLength });
    searchFrom = idx + 1;
  }
  return ranges;
}

/**
 * Search persons by name fields (display_name, nickname, given_name, preferred_name).
 *
 * Returns matching persons with character ranges indicating where the
 * query matched in display_name (for highlighting). When the match is
 * only on an alternate field, matchedField indicates which one.
 *
 * Prefix matches on display_name are sorted first, then alphabetically
 * within each group.
 *
 * Empty or whitespace-only query returns all persons with no ranges.
 */
export function searchPersons(
  persons: Person[],
  query: string,
): PersonSearchResult[] {
  const trimmed = query.trim();

  if (!trimmed) {
    return persons.map((person) => ({ person, matchRanges: [] }));
  }

  const lowerQuery = trimmed.toLowerCase();
  const queryLength = trimmed.length;
  const results: PersonSearchResult[] = [];

  for (const person of persons) {
    // Primary: match on display_name
    const displayRanges = findMatchRanges(person.display_name, lowerQuery, queryLength);

    if (displayRanges.length > 0) {
      results.push({ person, matchRanges: displayRanges });
      continue;
    }

    // Secondary: match on alternate name fields
    const altFields = [
      { field: "nickname" as const, value: person.nickname },
      { field: "given_name" as const, value: person.given_name },
      { field: "preferred_name" as const, value: person.preferred_name },
    ];

    let matched = false;
    for (const { field, value } of altFields) {
      if (value && value.toLowerCase().includes(lowerQuery)) {
        results.push({ person, matchRanges: [], matchedField: field });
        matched = true;
        break;
      }
    }

    if (matched) continue;
  }

  // Sort: display_name prefix matches first, then display_name non-prefix,
  // then alternate-field matches, all alphabetical within groups
  results.sort((a, b) => {
    const aIsDisplayMatch = a.matchRanges.length > 0;
    const bIsDisplayMatch = b.matchRanges.length > 0;
    const aIsPrefix = a.matchRanges[0]?.start === 0;
    const bIsPrefix = b.matchRanges[0]?.start === 0;

    // Display name matches before alternate field matches
    if (aIsDisplayMatch && !bIsDisplayMatch) return -1;
    if (!aIsDisplayMatch && bIsDisplayMatch) return 1;

    // Within display matches: prefix first
    if (aIsDisplayMatch && bIsDisplayMatch) {
      if (aIsPrefix && !bIsPrefix) return -1;
      if (!aIsPrefix && bIsPrefix) return 1;
    }

    return a.person.display_name.localeCompare(b.person.display_name);
  });

  return results;
}
