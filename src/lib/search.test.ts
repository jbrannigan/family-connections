import { describe, it, expect } from "vitest";
import { searchPersons } from "./search";
import type { Person } from "@/types/database";

function makePerson(name: string, id?: string): Person {
  return {
    id: id ?? name.toLowerCase().replace(/\s/g, "-"),
    graph_id: "test-graph",
    display_name: name,
    pronouns: null,
    birth_date: null,
    death_date: null,
    birth_location: null,
    is_incomplete: false,
    notes: null,
    created_by: "test",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  };
}

const testPersons: Person[] = [
  makePerson("John McGinty"),
  makePerson("Margaret Kirk"),
  makePerson("James Lynch McGinty"),
  makePerson("Mary Elizabeth McGinty"),
  makePerson("Thomas Kirk McGinty"),
  makePerson("Alice Moran"),
  makePerson("John Smith"),
];

describe("searchPersons", () => {
  it("returns all persons for empty query", () => {
    const results = searchPersons(testPersons, "");
    expect(results).toHaveLength(testPersons.length);
    expect(results.every((r) => r.matchRanges.length === 0)).toBe(true);
  });

  it("returns all persons for whitespace-only query", () => {
    const results = searchPersons(testPersons, "   ");
    expect(results).toHaveLength(testPersons.length);
  });

  it("matches case-insensitively", () => {
    const results = searchPersons(testPersons, "mcginty");
    expect(results.length).toBeGreaterThanOrEqual(3);
    expect(results.map((r) => r.person.display_name)).toContain("John McGinty");
    expect(results.map((r) => r.person.display_name)).toContain(
      "James Lynch McGinty",
    );
    expect(results.map((r) => r.person.display_name)).toContain(
      "Mary Elizabeth McGinty",
    );
  });

  it("matches partial names", () => {
    const results = searchPersons(testPersons, "Mar");
    expect(results.map((r) => r.person.display_name)).toContain("Margaret Kirk");
    expect(results.map((r) => r.person.display_name)).toContain(
      "Mary Elizabeth McGinty",
    );
  });

  it("returns empty array for no matches", () => {
    const results = searchPersons(testPersons, "zzzznotfound");
    expect(results).toHaveLength(0);
  });

  it("computes correct match ranges for single occurrence", () => {
    const results = searchPersons(testPersons, "Alice");
    expect(results).toHaveLength(1);
    expect(results[0].person.display_name).toBe("Alice Moran");
    expect(results[0].matchRanges).toEqual([{ start: 0, end: 5 }]);
  });

  it("computes correct match ranges for multiple occurrences", () => {
    const persons = [makePerson("Ana Banana")];
    const results = searchPersons(persons, "ana");
    expect(results).toHaveLength(1);
    // "Ana Banana" → "ana" at 0 and "ana" at 5 and "ana" at 7
    // Actually: "ana banana" → idx 0 ("ana"), idx 4 ("ana"), idx 7 is just "na"
    // Let's check: a(0)n(1)a(2) (3)b(4)a(5)n(6)a(7)n(8)a(9)
    // indexOf("ana", 0) = 0, indexOf("ana", 1) = 5, indexOf("ana", 6) = 7
    expect(results[0].matchRanges).toEqual([
      { start: 0, end: 3 },
      { start: 5, end: 8 },
      { start: 7, end: 10 },
    ]);
  });

  it("prioritizes prefix matches over non-prefix matches", () => {
    const results = searchPersons(testPersons, "John");
    expect(results.length).toBeGreaterThanOrEqual(2);
    // "John McGinty" and "John Smith" are prefix matches
    // They should come before any non-prefix matches
    const firstTwoNames = results.slice(0, 2).map((r) => r.person.display_name);
    expect(firstTwoNames).toContain("John McGinty");
    expect(firstTwoNames).toContain("John Smith");
  });

  it("sorts alphabetically within prefix and non-prefix groups", () => {
    const results = searchPersons(testPersons, "John");
    // Both are prefix matches, should be alphabetical
    const prefixResults = results.filter((r) => r.matchRanges[0]?.start === 0);
    const names = prefixResults.map((r) => r.person.display_name);
    expect(names).toEqual([...names].sort());
  });

  it("handles single-character query", () => {
    const results = searchPersons(testPersons, "A");
    expect(results.map((r) => r.person.display_name)).toContain("Alice Moran");
  });
});
