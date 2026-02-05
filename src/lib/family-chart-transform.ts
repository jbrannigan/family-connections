/**
 * Transform Person[] + Relationship[] into the format required by family-chart.
 *
 * family-chart expects nodes with:
 *   - id: string
 *   - data: { gender: 'M' | 'F', [key: string]: any }
 *   - rels: { parents: string[], spouses: string[], children: string[] }
 */

import type { Person, Relationship } from "@/types/database";

export interface FamilyChartDatum {
  id: string;
  data: {
    gender: "M" | "F";
    "first name": string;
    "last name": string;
    birthday?: string;
    avatar?: string;
    [key: string]: unknown;
  };
  rels: {
    parents: string[];
    spouses: string[];
    children: string[];
  };
}

/**
 * Infer gender from pronouns string.
 * Returns "M" or "F" — used by family-chart for spouse positioning.
 */
function inferGender(pronouns: string | null): "M" | "F" {
  if (!pronouns) return "M";
  const lower = pronouns.toLowerCase();
  if (lower.includes("she") || lower.includes("her")) return "F";
  if (lower.includes("he") || lower.includes("him")) return "M";
  return "M";
}

/**
 * Split display name into first and last name parts.
 */
function splitName(displayName: string): { first: string; last: string } {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { first: parts[0], last: "" };
  }
  return {
    first: parts[0],
    last: parts.slice(1).join(" "),
  };
}

/**
 * Transform our data model into family-chart format.
 *
 * IMPORTANT: family-chart has a specific data model:
 * - Each child should have at most ONE parent in their `parents` array
 * - The other parent is inferred through spouse relationships
 * - Children should only appear in ONE parent's `children` array
 *
 * This handles cycle detection to prevent infinite loops in the layout engine.
 */
export function transformToFamilyChartData(
  persons: Person[],
  relationships: Relationship[],
): FamilyChartDatum[] {
  const parentTypes = new Set([
    "biological_parent",
    "adoptive_parent",
    "step_parent",
  ]);
  const spouseTypes = new Set(["spouse", "ex_spouse", "partner"]);

  // Track which person IDs actually exist in our persons array
  const personIds = new Set(persons.map((p) => p.id));
  const personMap = new Map(persons.map((p) => [p.id, p]));

  // Build parent-child edges, then remove any that form cycles using DFS
  const parentEdges: Array<{ parentId: string; childId: string }> = [];
  for (const rel of relationships) {
    if (!personIds.has(rel.person_a) || !personIds.has(rel.person_b)) continue;
    if (parentTypes.has(rel.type)) {
      parentEdges.push({
        parentId: rel.person_a,
        childId: rel.person_b,
      });
    }
  }

  // Build temporary adjacency list (parent→children) to detect cycles via DFS
  const tempChildren = new Map<string, string[]>();
  for (const edge of parentEdges) {
    if (!tempChildren.has(edge.parentId)) tempChildren.set(edge.parentId, []);
    tempChildren.get(edge.parentId)!.push(edge.childId);
  }

  // Find all edges that are part of a cycle — use DFS with coloring
  // 0 = unvisited, 1 = in current path, 2 = finished
  const color = new Map<string, number>();
  const cycleEdges = new Set<string>();

  function dfs(nodeId: string): void {
    color.set(nodeId, 1);
    for (const childId of tempChildren.get(nodeId) ?? []) {
      const c = color.get(childId) ?? 0;
      if (c === 1) {
        // Back edge — this edge creates a cycle, mark it
        cycleEdges.add(`${nodeId}->${childId}`);
      } else if (c === 0) {
        dfs(childId);
      }
    }
    color.set(nodeId, 2);
  }

  for (const pid of personIds) {
    if ((color.get(pid) ?? 0) === 0) {
      dfs(pid);
    }
  }

  // Build spouse relationships (bidirectional)
  const personSpouses = new Map<string, string[]>();

  for (const rel of relationships) {
    if (!personIds.has(rel.person_a) || !personIds.has(rel.person_b)) continue;

    if (spouseTypes.has(rel.type)) {
      if (!personSpouses.has(rel.person_a)) personSpouses.set(rel.person_a, []);
      if (!personSpouses.get(rel.person_a)!.includes(rel.person_b)) {
        personSpouses.get(rel.person_a)!.push(rel.person_b);
      }

      if (!personSpouses.has(rel.person_b)) personSpouses.set(rel.person_b, []);
      if (!personSpouses.get(rel.person_b)!.includes(rel.person_a)) {
        personSpouses.get(rel.person_b)!.push(rel.person_a);
      }
    }
  }

  // For family-chart: each child needs exactly ONE parent in their parents array
  // We pick the "primary" parent (prefer male/father figure)
  // Children only go in that primary parent's children array
  const childToPrimaryParent = new Map<string, string>();
  const primaryParentToChildren = new Map<string, string[]>();

  for (const edge of parentEdges) {
    if (cycleEdges.has(`${edge.parentId}->${edge.childId}`)) continue;

    const childId = edge.childId;
    const parentId = edge.parentId;

    // If child doesn't have a primary parent yet, assign this one
    if (!childToPrimaryParent.has(childId)) {
      childToPrimaryParent.set(childId, parentId);
    } else {
      // Child already has a primary parent - check if this one is "better"
      // Prefer male parent as primary (family-chart convention)
      const currentPrimary = childToPrimaryParent.get(childId)!;
      const currentPerson = personMap.get(currentPrimary);
      const newPerson = personMap.get(parentId);

      const currentGender = inferGender(currentPerson?.pronouns ?? null);
      const newGender = inferGender(newPerson?.pronouns ?? null);

      // Prefer female/mother as primary parent (genealogy convention)
      if (currentGender === "M" && newGender === "F") {
        childToPrimaryParent.set(childId, parentId);
      }
    }
  }

  // Build the children arrays based on primary parent assignments
  for (const [childId, parentId] of childToPrimaryParent) {
    if (!primaryParentToChildren.has(parentId)) {
      primaryParentToChildren.set(parentId, []);
    }
    primaryParentToChildren.get(parentId)!.push(childId);
  }

  // Build the family-chart data array
  return persons.map((person): FamilyChartDatum => {
    const { first, last } = splitName(person.display_name);

    // Get the single primary parent (if any)
    const primaryParent = childToPrimaryParent.get(person.id);
    const parents = primaryParent ? [primaryParent] : [];

    return {
      id: person.id,
      data: {
        gender: inferGender(person.pronouns),
        "first name": first,
        "last name": last,
        birthday: person.birth_date ?? undefined,
        // Additional fields for display
        displayName: person.display_name,
        pronouns: person.pronouns,
        birthLocation: person.birth_location,
        deathDate: person.death_date,
        notes: person.notes,
      },
      rels: {
        parents,
        spouses: personSpouses.get(person.id) ?? [],
        children: primaryParentToChildren.get(person.id) ?? [],
      },
    };
  });
}

/**
 * Extract the connected component containing a given person.
 * Uses BFS over all relationship edges to find all persons reachable from start.
 */
export function getConnectedComponent(
  persons: Person[],
  relationships: Relationship[],
  startId: string,
): Set<string> {
  const personIds = new Set(persons.map((p) => p.id));
  const adjacency = new Map<string, Set<string>>();

  for (const rel of relationships) {
    if (!personIds.has(rel.person_a) || !personIds.has(rel.person_b)) continue;
    if (!adjacency.has(rel.person_a)) adjacency.set(rel.person_a, new Set());
    if (!adjacency.has(rel.person_b)) adjacency.set(rel.person_b, new Set());
    adjacency.get(rel.person_a)!.add(rel.person_b);
    adjacency.get(rel.person_b)!.add(rel.person_a);
  }

  const visited = new Set<string>();
  const queue = [startId];
  visited.add(startId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = adjacency.get(current);
    if (!neighbors) continue;
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return visited;
}

/**
 * Find the best root person for the tree layout.
 * Picks the person with no parents who has the most descendants.
 */
export function findRootPersonId(
  persons: Person[],
  relationships: Relationship[],
): string | null {
  if (persons.length === 0) return null;

  const parentTypes = new Set([
    "biological_parent",
    "adoptive_parent",
    "step_parent",
  ]);

  const childToParents = new Map<string, string[]>();
  const parentToChildren = new Map<string, string[]>();
  const personIds = new Set(persons.map((p) => p.id));

  for (const rel of relationships) {
    if (!parentTypes.has(rel.type)) continue;
    if (!personIds.has(rel.person_a) || !personIds.has(rel.person_b)) continue;

    if (!childToParents.has(rel.person_b))
      childToParents.set(rel.person_b, []);
    childToParents.get(rel.person_b)!.push(rel.person_a);

    if (!parentToChildren.has(rel.person_a))
      parentToChildren.set(rel.person_a, []);
    parentToChildren.get(rel.person_a)!.push(rel.person_b);
  }

  // Find persons with no parents (roots of the tree)
  const roots = persons.filter(
    (p) => !childToParents.has(p.id) || childToParents.get(p.id)!.length === 0,
  );

  if (roots.length === 0) {
    // No clear root — pick person with most connections
    const connectionCount = new Map<string, number>();
    for (const rel of relationships) {
      connectionCount.set(
        rel.person_a,
        (connectionCount.get(rel.person_a) ?? 0) + 1,
      );
      connectionCount.set(
        rel.person_b,
        (connectionCount.get(rel.person_b) ?? 0) + 1,
      );
    }
    let bestId = persons[0].id;
    let bestCount = 0;
    for (const [id, count] of connectionCount) {
      if (count > bestCount && personIds.has(id)) {
        bestId = id;
        bestCount = count;
      }
    }
    return bestId;
  }

  // Count descendants for each root
  function countDescendants(personId: string, visited: Set<string>): number {
    if (visited.has(personId)) return 0;
    visited.add(personId);
    const children = parentToChildren.get(personId) ?? [];
    let count = children.length;
    for (const childId of children) {
      count += countDescendants(childId, visited);
    }
    return count;
  }

  let bestRoot = roots[0];
  let bestDescendants = 0;

  for (const root of roots) {
    const descendants = countDescendants(root.id, new Set());
    if (descendants > bestDescendants) {
      bestDescendants = descendants;
      bestRoot = root;
    }
  }

  return bestRoot.id;
}
