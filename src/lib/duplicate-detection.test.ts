import { describe, it, expect } from "vitest";
import type { Person, Relationship } from "@/types/database";
import {
  normalizeForComparison,
  extractBirthYear,
  scorePair,
  findDuplicates,
} from "./duplicate-detection";

/** Helper to create a minimal Person for testing. */
function makePerson(overrides: Partial<Person> = {}): Person {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    graph_id: "test-graph",
    display_name: overrides.display_name ?? "Test Person",
    given_name: overrides.given_name ?? null,
    nickname: overrides.nickname ?? null,
    preferred_name: overrides.preferred_name ?? null,
    avatar_url: null,
    pronouns: null,
    birth_date: overrides.birth_date ?? null,
    death_date: overrides.death_date ?? null,
    birth_location: overrides.birth_location ?? null,
    is_incomplete: overrides.is_incomplete ?? false,
    notes: null,
    created_by: "user-1",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  };
}

/** Helper to create a minimal Relationship for testing. */
function makeRelationship(
  overrides: Partial<Relationship> = {},
): Relationship {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    graph_id: "test-graph",
    person_a: overrides.person_a ?? "parent-1",
    person_b: overrides.person_b ?? "child-1",
    type: overrides.type ?? "biological_parent",
    start_date: null,
    end_date: null,
    created_by: "user-1",
    created_at: "2025-01-01T00:00:00Z",
  };
}

describe("normalizeForComparison", () => {
  it("lowercases, trims, and collapses whitespace", () => {
    expect(normalizeForComparison("  John   McGinty  ")).toBe("john mcginty");
  });

  it("handles empty string", () => {
    expect(normalizeForComparison("")).toBe("");
  });
});

describe("extractBirthYear", () => {
  it("extracts year from full date", () => {
    expect(extractBirthYear("1958-03-15")).toBe("1958");
  });

  it("extracts year from year-month", () => {
    expect(extractBirthYear("1958-03")).toBe("1958");
  });

  it("extracts year-only", () => {
    expect(extractBirthYear("1958")).toBe("1958");
  });

  it("returns null for null input", () => {
    expect(extractBirthYear(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractBirthYear("")).toBeNull();
  });

  it("returns null for non-date string", () => {
    expect(extractBirthYear("unknown")).toBeNull();
  });
});

describe("scorePair", () => {
  it("scores 40 for exact display_name match (not 80)", () => {
    const a = makePerson({ display_name: "Margaret McGinty" });
    const b = makePerson({ display_name: "Margaret McGinty" });
    const { score, reasons } = scorePair(a, b);
    expect(score).toBe(40);
    expect(reasons).toContain("Same display name");
  });

  it("scores 40 for case-insensitive display_name match", () => {
    const a = makePerson({ display_name: "margaret mcginty" });
    const b = makePerson({ display_name: "Margaret McGinty" });
    const { score } = scorePair(a, b);
    expect(score).toBe(40);
  });

  it("scores 50 for same given name and surname (different display)", () => {
    const a = makePerson({ display_name: "Margaret (Peggy) McGinty" });
    const b = makePerson({ display_name: "Margaret McGinty" });
    const { score, reasons } = scorePair(a, b);
    expect(score).toBe(50);
    expect(reasons).toContain("Same surname");
    expect(reasons).toContain("Same given name");
  });

  it("gives nickname-to-given bonus when nickname matches given name", () => {
    const a = makePerson({
      display_name: "Margaret McGinty",
      nickname: "Peggy",
    });
    const b = makePerson({ display_name: "Peggy McGinty" });
    const { score, reasons } = scorePair(a, b);
    expect(reasons).toContain("Nickname matches given name");
    expect(score).toBeGreaterThanOrEqual(45); // surname (25) + nickname match (20)
  });

  it("scores 0 for completely different persons", () => {
    const a = makePerson({ display_name: "James Brannigan" });
    const b = makePerson({ display_name: "Maria Rodriguez" });
    const { score } = scorePair(a, b);
    expect(score).toBe(0);
  });

  it("adds 15 points for same birth year", () => {
    const a = makePerson({
      display_name: "James Brannigan",
      birth_date: "1958-03-15",
    });
    const b = makePerson({
      display_name: "James Brannigan",
      birth_date: "1958-07-22",
    });
    const { score, reasons } = scorePair(a, b);
    expect(reasons).toContain("Same birth year (1958)");
    expect(score).toBe(55); // 40 (name) + 15 (year)
  });

  it("adds 5 points for birth years within 2 years", () => {
    const a = makePerson({
      display_name: "James Brannigan",
      birth_date: "1958",
    });
    const b = makePerson({
      display_name: "James Brannigan",
      birth_date: "1960",
    });
    const { reasons } = scorePair(a, b);
    expect(reasons).toContain("Birth years close (1958 vs 1960)");
  });

  it("adds 10 points for same birth location", () => {
    const a = makePerson({
      display_name: "James Brannigan",
      birth_location: "Brooklyn, NY",
    });
    const b = makePerson({
      display_name: "James Brannigan",
      birth_location: "brooklyn, ny",
    });
    const { reasons } = scorePair(a, b);
    expect(reasons).toContain("Same birth location");
  });

  it("adds 5 points when one person is incomplete", () => {
    const a = makePerson({
      display_name: "James Brannigan",
      is_incomplete: true,
    });
    const b = makePerson({ display_name: "James Brannigan" });
    const { reasons } = scorePair(a, b);
    expect(reasons).toContain("Incomplete person record");
  });

  it("penalizes different generations (birth years >5 apart)", () => {
    const a = makePerson({
      display_name: "James Brannigan",
      birth_date: "1958",
    });
    const b = makePerson({
      display_name: "James Brannigan",
      birth_date: "1932",
    });
    const { score, reasons } = scorePair(a, b);
    expect(reasons).toContain("Different generations (1958 vs 1932)");
    // 40 (name) - 25 (generation) = 15, below threshold
    expect(score).toBe(15);
  });

  it("does not add birth year points when years differ by 3-5", () => {
    const a = makePerson({
      display_name: "James Brannigan",
      birth_date: "1958",
    });
    const b = makePerson({
      display_name: "James Brannigan",
      birth_date: "1962",
    });
    const { reasons } = scorePair(a, b);
    // 4 years apart: not same year, not within 2, not > 5 = no birth year factor
    expect(
      reasons.some(
        (r) =>
          r.includes("birth year") ||
          r.includes("Birth") ||
          r.includes("generation"),
      ),
    ).toBe(false);
  });

  it("adds 20 points when persons share a parent", () => {
    const parentId = "parent-1";
    const a = makePerson({ id: "child-a", display_name: "James Brannigan" });
    const b = makePerson({ id: "child-b", display_name: "James Brannigan" });
    const relationships: Relationship[] = [
      makeRelationship({ person_a: parentId, person_b: "child-a" }),
      makeRelationship({ person_a: parentId, person_b: "child-b" }),
    ];
    const { score, reasons } = scorePair(a, b, relationships);
    expect(reasons).toContain("Share a parent");
    expect(score).toBe(60); // 40 (name) + 20 (shared parent)
  });

  it("penalizes different parents by -30", () => {
    const a = makePerson({ id: "child-a", display_name: "James Brannigan" });
    const b = makePerson({ id: "child-b", display_name: "James Brannigan" });
    const relationships: Relationship[] = [
      makeRelationship({ person_a: "parent-1", person_b: "child-a" }),
      makeRelationship({ person_a: "parent-2", person_b: "child-b" }),
    ];
    const { score, reasons } = scorePair(a, b, relationships);
    expect(reasons).toContain("Different parents");
    // 40 (name) - 30 (different parents) = 10
    expect(score).toBe(10);
  });

  it("clamps score to minimum 0", () => {
    const a = makePerson({
      id: "child-a",
      display_name: "James Brannigan",
      birth_date: "1958",
    });
    const b = makePerson({
      id: "child-b",
      display_name: "James Brannigan",
      birth_date: "1990",
    });
    const relationships: Relationship[] = [
      makeRelationship({ person_a: "parent-1", person_b: "child-a" }),
      makeRelationship({ person_a: "parent-2", person_b: "child-b" }),
    ];
    const { score } = scorePair(a, b, relationships);
    // 40 (name) - 25 (generation) - 30 (parents) = -15 → clamped to 0
    expect(score).toBe(0);
  });

  it("does not apply relationship scoring when relationships not provided", () => {
    const a = makePerson({ id: "child-a", display_name: "James Brannigan" });
    const b = makePerson({ id: "child-b", display_name: "James Brannigan" });
    const { score } = scorePair(a, b);
    // Without relationships: just name match = 40
    expect(score).toBe(40);
  });
});

describe("findDuplicates", () => {
  it("returns empty for empty array", () => {
    expect(findDuplicates([])).toEqual([]);
  });

  it("returns empty for single person", () => {
    expect(findDuplicates([makePerson()])).toEqual([]);
  });

  it("finds exact name duplicates when above threshold", () => {
    const persons = [
      makePerson({ id: "1", display_name: "Margaret McGinty" }),
      makePerson({ id: "2", display_name: "Margaret McGinty" }),
    ];
    const dups = findDuplicates(persons);
    expect(dups).toHaveLength(1);
    expect(dups[0].score).toBe(40);
  });

  it("returns empty when no persons share name parts", () => {
    const persons = [
      makePerson({ id: "1", display_name: "James Brannigan" }),
      makePerson({ id: "2", display_name: "Maria Rodriguez" }),
    ];
    expect(findDuplicates(persons)).toEqual([]);
  });

  it("excludes pairs below threshold", () => {
    // Same given name only = 25 pts, below default threshold of 40
    const persons = [
      makePerson({ id: "1", display_name: "James Brannigan" }),
      makePerson({ id: "2", display_name: "James Rodriguez" }),
    ];
    expect(findDuplicates(persons)).toEqual([]);
  });

  it("sorts results by score descending", () => {
    const persons = [
      makePerson({
        id: "1",
        display_name: "Margaret McGinty",
        birth_date: "1958",
      }),
      makePerson({ id: "2", display_name: "Margaret McGinty" }), // exact = 40
      makePerson({
        id: "3",
        display_name: "Margaret McGinty",
        birth_date: "1958",
      }), // exact + same year = 55
    ];
    const dups = findDuplicates(persons);
    expect(dups.length).toBeGreaterThan(0);
    for (let i = 1; i < dups.length; i++) {
      expect(dups[i - 1].score).toBeGreaterThanOrEqual(dups[i].score);
    }
  });

  it("respects custom threshold", () => {
    const persons = [
      makePerson({ id: "1", display_name: "James Brannigan" }),
      makePerson({ id: "2", display_name: "James Rodriguez" }),
    ];
    // Given name match = 25 pts, below 40 but above 20
    const dups = findDuplicates(persons, 20);
    expect(dups.length).toBeGreaterThanOrEqual(1);
  });

  it("uses relationships for scoring when provided", () => {
    const persons = [
      makePerson({ id: "child-a", display_name: "James Brannigan" }),
      makePerson({ id: "child-b", display_name: "James Brannigan" }),
    ];
    const relationships: Relationship[] = [
      makeRelationship({ person_a: "parent-1", person_b: "child-a" }),
      makeRelationship({ person_a: "parent-2", person_b: "child-b" }),
    ];

    // Without relationships: score 40 (above threshold)
    const dupsWithout = findDuplicates(persons, 40);
    expect(dupsWithout).toHaveLength(1);

    // With relationships: score 10 (below threshold) — different parents penalty
    const dupsWith = findDuplicates(persons, 40, relationships);
    expect(dupsWith).toHaveLength(0);
  });

  it("filters out different-generation same-name pairs", () => {
    const persons = [
      makePerson({
        id: "1",
        display_name: "James Brannigan",
        birth_date: "1932",
      }),
      makePerson({
        id: "2",
        display_name: "James Brannigan",
        birth_date: "1958",
      }),
    ];
    // 40 (name) - 25 (generation) = 15, below threshold
    const dups = findDuplicates(persons);
    expect(dups).toHaveLength(0);
  });
});
