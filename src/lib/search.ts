/**
 * Search utility for filtering persons by display name.
 *
 * Uses case-insensitive substring matching with match range tracking
 * for highlighting. Prefix matches are sorted first.
 */

import type { Person } from "@/types/database";

export interface PersonSearchResult {
  person: Person;
  matchRanges: Array<{ start: number; end: number }>;
}

/**
 * Search persons by display name.
 *
 * Returns matching persons with character ranges indicating where the
 * query matched (for highlighting). Prefix matches are sorted first,
 * then alphabetically within each group.
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
  const results: PersonSearchResult[] = [];

  for (const person of persons) {
    const name = person.display_name;
    const lowerName = name.toLowerCase();
    const ranges: Array<{ start: number; end: number }> = [];

    let searchFrom = 0;
    while (searchFrom < lowerName.length) {
      const idx = lowerName.indexOf(lowerQuery, searchFrom);
      if (idx === -1) break;
      ranges.push({ start: idx, end: idx + trimmed.length });
      searchFrom = idx + 1;
    }

    if (ranges.length > 0) {
      results.push({ person, matchRanges: ranges });
    }
  }

  // Sort: prefix matches first, then alphabetical within each group
  results.sort((a, b) => {
    const aIsPrefix = a.matchRanges[0]?.start === 0;
    const bIsPrefix = b.matchRanges[0]?.start === 0;
    if (aIsPrefix && !bIsPrefix) return -1;
    if (!aIsPrefix && bIsPrefix) return 1;
    return a.person.display_name.localeCompare(b.person.display_name);
  });

  return results;
}
