import { describe, it, expect } from "vitest";
import { wouldCreateCycle } from "./relationships";
import type { Relationship, RelationshipType } from "@/types/database";

/** Helper to create a minimal parent-type relationship record. */
function parentRel(
  parentId: string,
  childId: string,
  type: RelationshipType = "biological_parent",
): Relationship {
  return {
    id: `rel-${parentId}-${childId}`,
    graph_id: "g1",
    person_a: parentId,
    person_b: childId,
    type,
    start_date: null,
    end_date: null,
    created_by: "u1",
    created_at: "2026-01-01",
  };
}

/** Helper to create a spouse-type relationship record. */
function spouseRel(personA: string, personB: string): Relationship {
  return {
    id: `rel-${personA}-${personB}`,
    graph_id: "g1",
    person_a: personA,
    person_b: personB,
    type: "spouse",
    start_date: null,
    end_date: null,
    created_by: "u1",
    created_at: "2026-01-01",
  };
}

describe("wouldCreateCycle", () => {
  it("detects direct cycle (A→B exists, adding B→A)", () => {
    const rels = [parentRel("A", "B")];
    // B is child of A. Trying to make B parent of A.
    expect(wouldCreateCycle("B", "A", rels)).toBe(true);
  });

  it("detects indirect 3-person cycle (A→B, B→C, adding C→A)", () => {
    const rels = [parentRel("A", "B"), parentRel("B", "C")];
    // C is grandchild of A. Trying to make C parent of A.
    expect(wouldCreateCycle("C", "A", rels)).toBe(true);
  });

  it("detects deep cycle (A→B→C→D→E, adding E→A)", () => {
    const rels = [
      parentRel("A", "B"),
      parentRel("B", "C"),
      parentRel("C", "D"),
      parentRel("D", "E"),
    ];
    expect(wouldCreateCycle("E", "A", rels)).toBe(true);
  });

  it("returns true for self-relationship", () => {
    expect(wouldCreateCycle("A", "A", [])).toBe(true);
  });

  it("returns false when no cycle (multiple parents)", () => {
    // A and B are both parents of C. Adding D as parent of C is fine.
    const rels = [parentRel("A", "C"), parentRel("B", "C")];
    expect(wouldCreateCycle("D", "C", rels)).toBe(false);
  });

  it("returns false for unrelated persons", () => {
    const rels = [parentRel("A", "B")];
    // C and D are unrelated to A→B chain
    expect(wouldCreateCycle("C", "D", rels)).toBe(false);
  });

  it("returns false for valid parent-child addition", () => {
    // A→B→C exists. Adding A→D (new child of A) is fine.
    const rels = [parentRel("A", "B"), parentRel("B", "C")];
    expect(wouldCreateCycle("A", "D", rels)).toBe(false);
  });

  it("ignores spouse relationships when checking cycles", () => {
    // A is spouse of B, B is parent of C.
    // Adding A as parent of C should NOT be a cycle (spouses ignored).
    const rels = [spouseRel("A", "B"), parentRel("B", "C")];
    expect(wouldCreateCycle("A", "C", rels)).toBe(false);
  });

  it("works with adoptive and step parent types", () => {
    const rels = [
      parentRel("A", "B", "adoptive_parent"),
      parentRel("B", "C", "step_parent"),
    ];
    // C is descendant of A through adoptive/step chain. Making C parent of A is a cycle.
    expect(wouldCreateCycle("C", "A", rels)).toBe(true);
  });

  it("returns false with empty relationships", () => {
    expect(wouldCreateCycle("A", "B", [])).toBe(false);
  });
});
