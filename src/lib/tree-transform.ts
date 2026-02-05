/**
 * Transform Person[] + Relationship[] into the format required by relatives-tree.
 *
 * relatives-tree expects nodes with:
 *   - parents[], children[], siblings[], spouses[] (all bidirectional)
 *   - gender: "male" | "female"
 *   - relation types: "blood" | "adopted" | "half" | "married" | "divorced"
 */

import type { Node as TreeNode, Relation, Gender, RelType } from "relatives-tree/lib/types";
import type { Person, Relationship } from "@/types/database";

/**
 * Infer gender from pronouns string.
 * Returns "male" or "female" — used by relatives-tree for spouse positioning only.
 */
function inferGender(pronouns: string | null): Gender {
  if (!pronouns) return "male" as Gender;
  const lower = pronouns.toLowerCase();
  if (lower.includes("she") || lower.includes("her")) return "female" as Gender;
  if (lower.includes("he") || lower.includes("him")) return "male" as Gender;
  return "male" as Gender;
}

/**
 * Map our relationship type to a relatives-tree relation type.
 */
function mapParentRelType(type: string): RelType {
  switch (type) {
    case "adoptive_parent":
      return "adopted" as RelType;
    case "step_parent":
      return "half" as RelType;
    default:
      return "blood" as RelType;
  }
}

function mapSpouseRelType(type: string): RelType {
  switch (type) {
    case "ex_spouse":
      return "divorced" as RelType;
    default:
      return "married" as RelType;
  }
}

/**
 * Transform our data model into relatives-tree nodes.
 */
export function transformToTreeNodes(
  persons: Person[],
  relationships: Relationship[],
): TreeNode[] {
  const parentTypes = new Set([
    "biological_parent",
    "adoptive_parent",
    "step_parent",
  ]);
  const spouseTypes = new Set(["spouse", "ex_spouse", "partner"]);

  // Build lookup structures
  const childToParents = new Map<string, Relation[]>();
  const parentToChildren = new Map<string, Relation[]>();
  const personSpouses = new Map<string, Relation[]>();

  // Track which person IDs actually exist in our persons array
  const personIds = new Set(persons.map((p) => p.id));

  // Build parent-child edges, then remove any that form cycles using DFS
  const parentEdges: Array<{ parentId: string; childId: string; relType: RelType }> = [];
  for (const rel of relationships) {
    if (!personIds.has(rel.person_a) || !personIds.has(rel.person_b)) continue;
    if (parentTypes.has(rel.type)) {
      parentEdges.push({
        parentId: rel.person_a,
        childId: rel.person_b,
        relType: mapParentRelType(rel.type),
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

  function dfs(nodeId: string, path: string[]): void {
    color.set(nodeId, 1);
    for (const childId of tempChildren.get(nodeId) ?? []) {
      const c = color.get(childId) ?? 0;
      if (c === 1) {
        // Back edge — this edge creates a cycle, mark it
        cycleEdges.add(`${nodeId}->${childId}`);
      } else if (c === 0) {
        dfs(childId, [...path, nodeId]);
      }
    }
    color.set(nodeId, 2);
  }

  for (const pid of personIds) {
    if ((color.get(pid) ?? 0) === 0) {
      dfs(pid, []);
    }
  }

  // Now build the actual parent/child maps, skipping cycle-creating edges
  for (const edge of parentEdges) {
    if (cycleEdges.has(`${edge.parentId}->${edge.childId}`)) continue;

    if (!childToParents.has(edge.childId)) childToParents.set(edge.childId, []);
    childToParents.get(edge.childId)!.push({ id: edge.parentId, type: edge.relType });

    if (!parentToChildren.has(edge.parentId)) parentToChildren.set(edge.parentId, []);
    parentToChildren.get(edge.parentId)!.push({ id: edge.childId, type: edge.relType });
  }

  for (const rel of relationships) {
    // Skip relationships referencing people not in our set
    if (!personIds.has(rel.person_a) || !personIds.has(rel.person_b)) continue;

    if (parentTypes.has(rel.type)) {
      // Already handled above
      continue;
    } else if (spouseTypes.has(rel.type)) {
      const relType = mapSpouseRelType(rel.type);

      // Bidirectional spouse
      if (!personSpouses.has(rel.person_a))
        personSpouses.set(rel.person_a, []);
      personSpouses.get(rel.person_a)!.push({ id: rel.person_b, type: relType });

      if (!personSpouses.has(rel.person_b))
        personSpouses.set(rel.person_b, []);
      personSpouses.get(rel.person_b)!.push({ id: rel.person_a, type: relType });
    }
  }

  // Derive siblings: two people who share at least one parent
  const personSiblings = new Map<string, Relation[]>();

  for (const person of persons) {
    const myParents = childToParents.get(person.id) ?? [];
    const siblingSet = new Map<string, number>(); // siblingId → shared parent count

    for (const parentRel of myParents) {
      const parentsChildren = parentToChildren.get(parentRel.id) ?? [];
      for (const childRel of parentsChildren) {
        if (childRel.id !== person.id) {
          siblingSet.set(
            childRel.id,
            (siblingSet.get(childRel.id) ?? 0) + 1,
          );
        }
      }
    }

    const siblings: Relation[] = [];
    for (const [sibId, sharedCount] of siblingSet) {
      siblings.push({
        id: sibId,
        type: (sharedCount >= 2 ? "blood" : "half") as RelType,
      });
    }
    if (siblings.length > 0) {
      personSiblings.set(person.id, siblings);
    }
  }

  // Build TreeNode array
  const personMap = new Map(persons.map((p) => [p.id, p]));

  return persons.map((person): TreeNode => {
    return {
      id: person.id,
      gender: inferGender(person.pronouns),
      parents: childToParents.get(person.id) ?? [],
      children: parentToChildren.get(person.id) ?? [],
      siblings: personSiblings.get(person.id) ?? [],
      spouses: personSpouses.get(person.id) ?? [],
    };
  });
}

/**
 * Extract the connected component containing a given person.
 * Uses BFS over all relationship edges (parent, spouse) to find
 * all persons reachable from the starting person.
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

  // Build child→parent and parent→child maps
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
