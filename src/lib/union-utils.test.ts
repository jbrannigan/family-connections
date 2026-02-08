import { describe, it, expect } from "vitest";
import {
  resolveUnions,
  formatUnionDateRange,
  getUnionLabel,
  getUnionTypeLabel,
} from "./union-utils";
import type { Person, Relationship } from "@/types/database";

// ── Helpers ──────────────────────────────────────────────

function makePerson(overrides: Partial<Person> & { id: string }): Person {
  return {
    graph_id: "g1",
    display_name: "Test Person",
    given_name: null,
    nickname: null,
    preferred_name: null,
    avatar_url: null,
    pronouns: null,
    birth_date: null,
    death_date: null,
    birth_location: null,
    is_incomplete: false,
    notes: null,
    created_by: "u1",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  };
}

function makeRel(
  overrides: Partial<Relationship> & { person_a: string; person_b: string; type: string },
): Relationship {
  return {
    id: `rel-${Math.random().toString(36).slice(2, 8)}`,
    graph_id: "g1",
    start_date: null,
    end_date: null,
    created_by: "u1",
    created_at: "2026-01-01",
    ...overrides,
  } as Relationship;
}

// ── resolveUnions ────────────────────────────────────────

describe("resolveUnions", () => {
  const john = makePerson({ id: "john", display_name: "John McGinty" });
  const margaret = makePerson({ id: "margaret", display_name: "Margaret Kirk" });
  const mary = makePerson({ id: "mary", display_name: "Mary Smith" });
  const persons = [john, margaret, mary];

  it("returns empty array when no spouse relationships exist", () => {
    const rels = [
      makeRel({ person_a: "john", person_b: "child1", type: "biological_parent" }),
    ];
    const result = resolveUnions("john", rels, persons);
    expect(result).toEqual([]);
  });

  it("resolves a single marriage", () => {
    const rels = [
      makeRel({ person_a: "john", person_b: "margaret", type: "spouse" }),
    ];
    const result = resolveUnions("john", rels, persons);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("married");
    expect(result[0].label).toBe("Married");
    expect(result[0].icon).toBe("💍");
    expect(result[0].partner.id).toBe("margaret");
  });

  it("resolves union when person is person_b", () => {
    const rels = [
      makeRel({ person_a: "john", person_b: "margaret", type: "spouse" }),
    ];
    const result = resolveUnions("margaret", rels, persons);
    expect(result).toHaveLength(1);
    expect(result[0].partner.id).toBe("john");
  });

  it("resolves divorced relationship", () => {
    const rels = [
      makeRel({
        person_a: "john",
        person_b: "margaret",
        type: "ex_spouse",
        start_date: "1958",
        end_date: "1990",
      }),
    ];
    const result = resolveUnions("john", rels, persons);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("divorced");
    expect(result[0].label).toBe("Divorced");
    expect(result[0].icon).toBe("💔");
    expect(result[0].startDate).toBe("1958");
    expect(result[0].endDate).toBe("1990");
  });

  it("resolves partner relationship", () => {
    const rels = [
      makeRel({ person_a: "john", person_b: "margaret", type: "partner" }),
    ];
    const result = resolveUnions("john", rels, persons);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("partners");
    expect(result[0].label).toBe("Partners");
    expect(result[0].icon).toBe("🤝");
  });

  it("resolves multiple unions sorted chronologically", () => {
    const rels = [
      makeRel({
        person_a: "john",
        person_b: "mary",
        type: "spouse",
        start_date: "1995",
      }),
      makeRel({
        person_a: "john",
        person_b: "margaret",
        type: "ex_spouse",
        start_date: "1958",
        end_date: "1990",
      }),
    ];
    const result = resolveUnions("john", rels, persons);
    expect(result).toHaveLength(2);
    // Margaret first (1958), then Mary (1995)
    expect(result[0].partner.id).toBe("margaret");
    expect(result[1].partner.id).toBe("mary");
  });

  it("sorts unions with null dates after dated unions", () => {
    const rels = [
      makeRel({ person_a: "john", person_b: "mary", type: "spouse" }),
      makeRel({
        person_a: "john",
        person_b: "margaret",
        type: "ex_spouse",
        start_date: "1958",
      }),
    ];
    const result = resolveUnions("john", rels, persons);
    expect(result).toHaveLength(2);
    expect(result[0].partner.id).toBe("margaret"); // has date
    expect(result[1].partner.id).toBe("mary"); // no date
  });

  it("sorts unions with null dates alphabetically by partner name", () => {
    const rels = [
      makeRel({ person_a: "john", person_b: "mary", type: "spouse" }),
      makeRel({ person_a: "john", person_b: "margaret", type: "partner" }),
    ];
    const result = resolveUnions("john", rels, persons);
    expect(result).toHaveLength(2);
    expect(result[0].partner.display_name).toBe("Margaret Kirk");
    expect(result[1].partner.display_name).toBe("Mary Smith");
  });

  it("ignores parent-child relationships", () => {
    const child = makePerson({ id: "child1", display_name: "Child" });
    const rels = [
      makeRel({ person_a: "john", person_b: "child1", type: "biological_parent" }),
      makeRel({ person_a: "john", person_b: "margaret", type: "spouse" }),
    ];
    const result = resolveUnions("john", rels, [...persons, child]);
    expect(result).toHaveLength(1);
    expect(result[0].partner.id).toBe("margaret");
  });

  it("skips unions with unknown partner", () => {
    const rels = [
      makeRel({ person_a: "john", person_b: "unknown-id", type: "spouse" }),
    ];
    const result = resolveUnions("john", rels, persons);
    expect(result).toEqual([]);
  });
});

// ── formatUnionDateRange ─────────────────────────────────

describe("formatUnionDateRange", () => {
  it("returns null when both dates are null", () => {
    expect(formatUnionDateRange(null, null)).toBeNull();
  });

  it("formats full range with start and end", () => {
    expect(formatUnionDateRange("1958", "1990")).toBe("1958–1990");
  });

  it("formats start-only as 'since YEAR'", () => {
    expect(formatUnionDateRange("1958", null)).toBe("since 1958");
  });

  it("formats end-only as 'until YEAR'", () => {
    expect(formatUnionDateRange(null, "1990")).toBe("until 1990");
  });

  it("extracts year from full date", () => {
    expect(formatUnionDateRange("1958-03-15", "1990-12-01")).toBe("1958–1990");
  });

  it("extracts year from year-month date", () => {
    expect(formatUnionDateRange("1958-03", null)).toBe("since 1958");
  });
});

// ── getUnionLabel ────────────────────────────────────────

describe("getUnionLabel", () => {
  it("returns 'Married to' for spouse", () => {
    expect(getUnionLabel("spouse")).toBe("Married to");
  });

  it("returns 'Divorced from' for ex_spouse", () => {
    expect(getUnionLabel("ex_spouse")).toBe("Divorced from");
  });

  it("returns 'Partner of' for partner", () => {
    expect(getUnionLabel("partner")).toBe("Partner of");
  });

  it("returns raw type for unknown types", () => {
    expect(getUnionLabel("some_other_type")).toBe("some_other_type");
  });
});

// ── getUnionTypeLabel ────────────────────────────────────

describe("getUnionTypeLabel", () => {
  it("returns 'Married' for spouse", () => {
    expect(getUnionTypeLabel("spouse")).toBe("Married");
  });

  it("returns 'Divorced' for ex_spouse", () => {
    expect(getUnionTypeLabel("ex_spouse")).toBe("Divorced");
  });

  it("returns 'Partners' for partner", () => {
    expect(getUnionTypeLabel("partner")).toBe("Partners");
  });

  it("returns raw type for unknown types", () => {
    expect(getUnionTypeLabel("engaged")).toBe("engaged");
  });
});
