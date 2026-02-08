import { describe, it, expect } from "vitest";
import {
  transformToHierarchicalTree,
  transformToAncestorTree,
  transformToDescendantTree,
  type TreeDisplayNode,
} from "./dtree-transform";
import type { Person, Relationship, RelationshipType } from "@/types/database";

// ── Helpers ──────────────────────────────────────────────

function makePerson(
  overrides: Partial<Person> & { id: string; display_name: string },
): Person {
  return {
    graph_id: "g1",
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

function makeParentRel(
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

function makeSpouseRel(
  id1: string,
  id2: string,
  type: RelationshipType = "spouse",
): Relationship {
  return {
    id: `rel-${id1}-${id2}-spouse`,
    graph_id: "g1",
    person_a: id1,
    person_b: id2,
    type,
    start_date: null,
    end_date: null,
    created_by: "u1",
    created_at: "2026-01-01",
  };
}

// ── Test data: Three-generation family ───────────────────
//
//   Grandpa & Grandma
//         |
//     Dad & Mom
//       |    |
//    Child  Sibling
//

const grandpa = makePerson({
  id: "grandpa",
  display_name: "Grandpa Smith",
  birth_date: "1930",
});
const grandma = makePerson({
  id: "grandma",
  display_name: "Grandma Jones",
  birth_date: "1932",
});
const dad = makePerson({
  id: "dad",
  display_name: "Dad Smith",
  birth_date: "1960",
});
const mom = makePerson({
  id: "mom",
  display_name: "Mom Brown",
  birth_date: "1962",
});
const child = makePerson({
  id: "child",
  display_name: "Child Smith",
  birth_date: "1990",
});
const sibling = makePerson({
  id: "sibling",
  display_name: "Sibling Smith",
  birth_date: "1992",
});

// Grandpa & Grandma are parents of Dad
// Dad & Mom are parents of Child and Sibling
const allPersons = [grandpa, grandma, dad, mom, child, sibling];
const allRels: Relationship[] = [
  makeSpouseRel("grandpa", "grandma"),
  makeParentRel("grandpa", "dad"),
  makeParentRel("grandma", "dad"),
  makeSpouseRel("dad", "mom"),
  makeParentRel("dad", "child"),
  makeParentRel("mom", "child"),
  makeParentRel("dad", "sibling"),
  makeParentRel("mom", "sibling"),
];

/** Find a node by person ID anywhere in the tree */
function findNodeByPersonId(
  nodes: TreeDisplayNode[],
  personId: string,
): TreeDisplayNode | null {
  for (const node of nodes) {
    if (node.personIds.includes(personId)) return node;
    const found = findNodeByPersonId(node.children, personId);
    if (found) return found;
  }
  return null;
}

/** Collect all person IDs in the tree */
function collectAllPersonIds(nodes: TreeDisplayNode[]): Set<string> {
  const ids = new Set<string>();
  for (const node of nodes) {
    for (const id of node.personIds) ids.add(id);
    for (const id of collectAllPersonIds(node.children)) ids.add(id);
  }
  return ids;
}

// ── transformToHierarchicalTree (regression) ─────────────

describe("transformToHierarchicalTree", () => {
  it("builds a tree from the three-generation family", () => {
    const tree = transformToHierarchicalTree(allPersons, allRels);

    expect(tree).toHaveLength(1);
    // Root should be grandpa (oldest ancestor with most descendants)
    expect(tree[0].personIds).toContain("grandpa");
  });

  it("returns empty array for empty input", () => {
    expect(transformToHierarchicalTree([], [])).toEqual([]);
  });

  it("includes all persons in the tree", () => {
    const tree = transformToHierarchicalTree(allPersons, allRels);
    const allIds = collectAllPersonIds(tree);

    expect(allIds.has("grandpa")).toBe(true);
    expect(allIds.has("grandma")).toBe(true);
    expect(allIds.has("dad")).toBe(true);
    expect(allIds.has("mom")).toBe(true);
    expect(allIds.has("child")).toBe(true);
    expect(allIds.has("sibling")).toBe(true);
  });

  it("creates couple nodes for spouses", () => {
    const tree = transformToHierarchicalTree(allPersons, allRels);

    // Root should be a couple node (grandpa + grandma)
    expect(tree[0].personIds).toHaveLength(2);
    expect(tree[0].personIds).toContain("grandpa");
    expect(tree[0].personIds).toContain("grandma");
    expect(tree[0].unionType).toBe("spouse");
  });
});

// ── transformToAncestorTree ──────────────────────────────

describe("transformToAncestorTree", () => {
  it("returns empty array for unknown person ID", () => {
    const tree = transformToAncestorTree(allPersons, allRels, "unknown-id");
    expect(tree).toEqual([]);
  });

  it("returns single node for person with no parents", () => {
    const tree = transformToAncestorTree(allPersons, allRels, "grandpa");

    expect(tree).toHaveLength(1);
    expect(tree[0].personIds).toContain("grandpa");
    // Grandpa has a spouse but no parents, so children array should be empty
    expect(tree[0].children).toHaveLength(0);
  });

  it("returns focus person + parents as couple node", () => {
    const tree = transformToAncestorTree(allPersons, allRels, "dad");

    expect(tree).toHaveLength(1);
    // Root is Dad (+ Mom as couple)
    expect(tree[0].personIds).toContain("dad");

    // Dad's "children" in ancestor tree = his parents
    expect(tree[0].children.length).toBeGreaterThanOrEqual(1);

    // Should find grandpa (with grandma as couple) in the ancestor nodes
    const allIds = collectAllPersonIds(tree);
    expect(allIds.has("grandpa")).toBe(true);
    expect(allIds.has("grandma")).toBe(true);
  });

  it("returns three generations for child", () => {
    const tree = transformToAncestorTree(allPersons, allRels, "child");

    expect(tree).toHaveLength(1);
    // Root is Child
    expect(tree[0].personIds).toContain("child");

    // Should contain all direct ancestors
    const allIds = collectAllPersonIds(tree);
    expect(allIds.has("child")).toBe(true);
    expect(allIds.has("dad")).toBe(true);
    expect(allIds.has("mom")).toBe(true);
    expect(allIds.has("grandpa")).toBe(true);
    expect(allIds.has("grandma")).toBe(true);
  });

  it("does NOT include siblings of the focus person", () => {
    const tree = transformToAncestorTree(allPersons, allRels, "child");
    const allIds = collectAllPersonIds(tree);

    // Sibling should NOT appear in child's ancestor tree
    expect(allIds.has("sibling")).toBe(false);
  });

  it("does NOT include descendants of ancestors (aunts/uncles)", () => {
    // Add an uncle (grandpa's other child)
    const uncle = makePerson({
      id: "uncle",
      display_name: "Uncle Smith",
      birth_date: "1965",
    });
    const persons = [...allPersons, uncle];
    const rels = [
      ...allRels,
      makeParentRel("grandpa", "uncle"),
      makeParentRel("grandma", "uncle"),
    ];

    const tree = transformToAncestorTree(persons, rels, "child");
    const allIds = collectAllPersonIds(tree);

    // Uncle should NOT appear
    expect(allIds.has("uncle")).toBe(false);
  });

  it("handles single parent (no spouse)", () => {
    const singleParent = makePerson({
      id: "single-parent",
      display_name: "Single Parent",
    });
    const kid = makePerson({ id: "kid", display_name: "Kid" });
    const rels = [makeParentRel("single-parent", "kid")];

    const tree = transformToAncestorTree([singleParent, kid], rels, "kid");

    expect(tree).toHaveLength(1);
    expect(tree[0].personIds).toEqual(["kid"]);

    // Parent should be a single node (no spouse)
    const parentNode = tree[0].children[0];
    expect(parentNode.personIds).toEqual(["single-parent"]);
    expect(parentNode.unionType).toBeNull();
  });

  it("handles adoptive_parent relationship type", () => {
    const adoptiveParent = makePerson({
      id: "adoptive",
      display_name: "Adoptive Parent",
    });
    const adopted = makePerson({
      id: "adopted",
      display_name: "Adopted Child",
    });
    const rels = [makeParentRel("adoptive", "adopted", "adoptive_parent")];

    const tree = transformToAncestorTree(
      [adoptiveParent, adopted],
      rels,
      "adopted",
    );
    const allIds = collectAllPersonIds(tree);

    expect(allIds.has("adoptive")).toBe(true);
  });

  it("handles step_parent relationship type", () => {
    const stepParent = makePerson({
      id: "step",
      display_name: "Step Parent",
    });
    const stepChild = makePerson({
      id: "stepchild",
      display_name: "Step Child",
    });
    const rels = [makeParentRel("step", "stepchild", "step_parent")];

    const tree = transformToAncestorTree(
      [stepParent, stepChild],
      rels,
      "stepchild",
    );
    const allIds = collectAllPersonIds(tree);

    expect(allIds.has("step")).toBe(true);
  });

  it("sets correct unionType on couple nodes", () => {
    const tree = transformToAncestorTree(allPersons, allRels, "child");

    // The root node (child) should not have a union type (single person)
    expect(tree[0].unionType).toBeNull();

    // Find dad's node — should be a couple with mom
    const dadNode = findNodeByPersonId(tree[0].children, "dad");
    expect(dadNode).not.toBeNull();
    expect(dadNode!.unionType).toBe("spouse");
  });
});

// ── transformToDescendantTree ────────────────────────────

describe("transformToDescendantTree", () => {
  it("returns empty array for unknown person ID", () => {
    const tree = transformToDescendantTree(allPersons, allRels, "unknown-id");
    expect(tree).toEqual([]);
  });

  it("returns single node for person with no children", () => {
    const tree = transformToDescendantTree(allPersons, allRels, "child");

    expect(tree).toHaveLength(1);
    expect(tree[0].personIds).toContain("child");
    expect(tree[0].children).toHaveLength(0);
  });

  it("returns person + children for one generation", () => {
    const tree = transformToDescendantTree(allPersons, allRels, "dad");

    expect(tree).toHaveLength(1);
    // Root should be Dad (+ Mom as couple)
    expect(tree[0].personIds).toContain("dad");
    expect(tree[0].personIds).toContain("mom");

    // Should have Child and Sibling as children
    const childIds = new Set<string>();
    for (const child of tree[0].children) {
      for (const id of child.personIds) childIds.add(id);
    }
    expect(childIds.has("child")).toBe(true);
    expect(childIds.has("sibling")).toBe(true);
  });

  it("returns three generations from grandpa", () => {
    const tree = transformToDescendantTree(allPersons, allRels, "grandpa");

    expect(tree).toHaveLength(1);
    const allIds = collectAllPersonIds(tree);

    // Should include all descendants
    expect(allIds.has("grandpa")).toBe(true);
    expect(allIds.has("grandma")).toBe(true);
    expect(allIds.has("dad")).toBe(true);
    expect(allIds.has("mom")).toBe(true);
    expect(allIds.has("child")).toBe(true);
    expect(allIds.has("sibling")).toBe(true);
  });

  it("uses specified person as root (not auto-selected)", () => {
    // Start from Dad — should NOT include Grandpa or Grandma
    const tree = transformToDescendantTree(allPersons, allRels, "dad");
    const allIds = collectAllPersonIds(tree);

    expect(allIds.has("grandpa")).toBe(false);
    expect(allIds.has("grandma")).toBe(false);
    expect(allIds.has("dad")).toBe(true);
    expect(allIds.has("child")).toBe(true);
  });

  it("includes spouse as couple node", () => {
    const tree = transformToDescendantTree(allPersons, allRels, "dad");

    expect(tree[0].personIds).toHaveLength(2);
    expect(tree[0].personIds).toContain("dad");
    expect(tree[0].personIds).toContain("mom");
    expect(tree[0].unionType).toBe("spouse");
  });
});
