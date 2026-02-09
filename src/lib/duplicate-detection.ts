import { parseDisplayName } from "@/lib/name-utils";
import type { Person, Relationship } from "@/types/database";

/**
 * A pair of persons identified as potential duplicates.
 */
export interface DuplicatePair {
  personA: Person;
  personB: Person;
  score: number;
  reasons: string[];
}

/** Relationship types where person_a is the parent. */
const PARENT_TYPES = new Set([
  "biological_parent",
  "adoptive_parent",
  "step_parent",
]);

/**
 * Get the set of parent IDs for a person from the relationships list.
 * In parent relationships, person_a is the parent and person_b is the child.
 */
function getParentIds(
  personId: string,
  relationships: Relationship[],
): Set<string> {
  const parents = new Set<string>();
  for (const rel of relationships) {
    if (PARENT_TYPES.has(rel.type) && rel.person_b === personId) {
      parents.add(rel.person_a);
    }
  }
  return parents;
}

/**
 * Normalize a string for comparison: lowercase, trim, collapse whitespace.
 */
export function normalizeForComparison(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

/**
 * Extract a 4-digit birth year from a date string.
 * Supports ISO 8601 reduced precision: "1958", "1958-03", "1958-03-15".
 */
export function extractBirthYear(
  birthDate: string | null,
): string | null {
  if (!birthDate) return null;
  const match = birthDate.trim().match(/^(\d{4})/);
  return match ? match[1] : null;
}

/**
 * Score how likely two persons are duplicates.
 * Returns a score (0–100+) and human-readable reasons.
 *
 * In real families, the same name is extremely common across generations
 * (naming traditions, "Jr/Sr", etc). The scoring is tuned to avoid false
 * positives: a name match alone is NOT enough to flag duplicates. We need
 * corroborating evidence (same birth year, shared parents) or anti-signals
 * (different generations, different parents) to decide.
 *
 * Scoring:
 *  - Exact display_name match (case-insensitive): 40 pts
 *  - Same surname (parsed): 25 pts
 *  - Same given name (parsed): 25 pts
 *  - Nickname matches other's given name: 20 pts
 *  - Same birth year: 15 pts
 *  - Birth year within 2 years: 5 pts
 *  - Same birth location: 10 pts
 *  - One person is is_incomplete: 5 pts
 *  - Share a parent: +20 pts  (strong evidence of same person)
 *  - Different parents: -30 pts (strong evidence of different people)
 *  - Different generations (birth years >5 apart): -25 pts
 */
export function scorePair(
  a: Person,
  b: Person,
  relationships?: Relationship[],
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const nameA = normalizeForComparison(a.display_name);
  const nameB = normalizeForComparison(b.display_name);

  // Exact display_name match — common in families, not conclusive alone
  if (nameA === nameB) {
    score += 40;
    reasons.push("Same display name");
  } else {
    // Parse names for component matching
    const parsedA = parseDisplayName(a.display_name);
    const parsedB = parseDisplayName(b.display_name);

    const givenA = normalizeForComparison(parsedA.givenName);
    const givenB = normalizeForComparison(parsedB.givenName);
    const surnameA = parsedA.surname
      ? normalizeForComparison(parsedA.surname)
      : null;
    const surnameB = parsedB.surname
      ? normalizeForComparison(parsedB.surname)
      : null;

    if (surnameA && surnameB && surnameA === surnameB) {
      score += 25;
      reasons.push("Same surname");
    }

    if (givenA && givenB && givenA === givenB) {
      score += 25;
      reasons.push("Same given name");
    }

    // Nickname cross-matching: A's nickname matches B's given name or vice versa
    const nickA = a.nickname
      ? normalizeForComparison(a.nickname)
      : parsedA.nickname
        ? normalizeForComparison(parsedA.nickname)
        : null;
    const nickB = b.nickname
      ? normalizeForComparison(b.nickname)
      : parsedB.nickname
        ? normalizeForComparison(parsedB.nickname)
        : null;

    if (
      (nickA && givenB && nickA === givenB) ||
      (nickB && givenA && nickB === givenA)
    ) {
      score += 20;
      reasons.push("Nickname matches given name");
    }
  }

  // Birth year comparison
  const yearA = extractBirthYear(a.birth_date);
  const yearB = extractBirthYear(b.birth_date);

  if (yearA && yearB) {
    const diff = Math.abs(parseInt(yearA, 10) - parseInt(yearB, 10));
    if (diff === 0) {
      score += 15;
      reasons.push(`Same birth year (${yearA})`);
    } else if (diff <= 2) {
      score += 5;
      reasons.push(`Birth years close (${yearA} vs ${yearB})`);
    } else if (diff > 5) {
      // Different generations — strong signal these are different people
      score -= 25;
      reasons.push(`Different generations (${yearA} vs ${yearB})`);
    }
  }

  // Birth location comparison
  if (a.birth_location && b.birth_location) {
    if (
      normalizeForComparison(a.birth_location) ===
      normalizeForComparison(b.birth_location)
    ) {
      score += 10;
      reasons.push("Same birth location");
    }
  }

  // Incomplete person bonus
  if (a.is_incomplete || b.is_incomplete) {
    score += 5;
    reasons.push("Incomplete person record");
  }

  // Relationship-aware scoring (when relationships are provided)
  if (relationships && relationships.length > 0) {
    const parentsA = getParentIds(a.id, relationships);
    const parentsB = getParentIds(b.id, relationships);

    if (parentsA.size > 0 && parentsB.size > 0) {
      // Check if they share any parent
      let sharedParent = false;
      for (const pid of parentsA) {
        if (parentsB.has(pid)) {
          sharedParent = true;
          break;
        }
      }

      if (sharedParent) {
        score += 20;
        reasons.push("Share a parent");
      } else {
        // Both have parents but they're different — very likely different people
        score -= 30;
        reasons.push("Different parents");
      }
    }
  }

  return { score: Math.max(0, score), reasons };
}

/**
 * Find all potential duplicate pairs among a list of persons.
 * Uses name-part blocking to avoid O(n²) full comparisons.
 * Returns pairs sorted by score descending, filtered by threshold ≥ 40.
 */
export function findDuplicates(
  persons: Person[],
  threshold = 40,
  relationships?: Relationship[],
): DuplicatePair[] {
  if (persons.length < 2) return [];

  // Build blocking index: map normalized name parts → person indices
  const byGivenName = new Map<string, number[]>();
  const bySurname = new Map<string, number[]>();
  const byNickname = new Map<string, number[]>();

  for (let i = 0; i < persons.length; i++) {
    const parsed = parseDisplayName(persons[i].display_name);
    const given = normalizeForComparison(parsed.givenName);
    if (given) {
      const list = byGivenName.get(given) ?? [];
      list.push(i);
      byGivenName.set(given, list);
    }
    if (parsed.surname) {
      const surname = normalizeForComparison(parsed.surname);
      const list = bySurname.get(surname) ?? [];
      list.push(i);
      bySurname.set(surname, list);
    }
    // Index by nickname and by person.nickname column
    const nick =
      persons[i].nickname ?? parsed.nickname;
    if (nick) {
      const normNick = normalizeForComparison(nick);
      const list = byNickname.get(normNick) ?? [];
      list.push(i);
      byNickname.set(normNick, list);

      // Also index nickname as a potential given name match
      const givenList = byGivenName.get(normNick) ?? [];
      if (!givenList.includes(i)) {
        givenList.push(i);
        byGivenName.set(normNick, givenList);
      }
    }
  }

  // Collect candidate pairs (persons sharing at least one name part)
  const candidatePairs = new Set<string>();

  function addPairsFromIndex(index: Map<string, number[]>) {
    for (const indices of index.values()) {
      for (let i = 0; i < indices.length; i++) {
        for (let j = i + 1; j < indices.length; j++) {
          const a = Math.min(indices[i], indices[j]);
          const b = Math.max(indices[i], indices[j]);
          candidatePairs.add(`${a}:${b}`);
        }
      }
    }
  }

  addPairsFromIndex(byGivenName);
  addPairsFromIndex(bySurname);
  addPairsFromIndex(byNickname);

  // Score candidate pairs
  const results: DuplicatePair[] = [];

  for (const key of candidatePairs) {
    const [ai, bi] = key.split(":").map(Number);
    const { score, reasons } = scorePair(
      persons[ai],
      persons[bi],
      relationships,
    );
    if (score >= threshold) {
      results.push({
        personA: persons[ai],
        personB: persons[bi],
        score,
        reasons,
      });
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score - a.score);

  return results;
}
