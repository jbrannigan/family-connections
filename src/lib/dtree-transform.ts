/**
 * Transform Person[] + Relationship[] into the format required by d3-dtree.
 *
 * dTree expects a hierarchical structure where:
 * - Each node represents a "family unit" (person or couple)
 * - For couples: we combine them into a single node like "Person1 & Person2"
 * - Children are nested under their parent unit
 *
 * This matches the format from the original working tree visualization
 * where nodes showed combined names like "John McGinty (1870-1909) & Margaret Kirk (1871-1906)"
 */

import type { Person, Relationship } from "@/types/database";

// Simple hierarchical node for visualization
export interface TreeDisplayNode {
  id: string;
  name: string;
  personIds: string[]; // UUIDs of the 1 or 2 persons represented by this node
  children: TreeDisplayNode[];
}

// dTree node structure (for the library)
export interface DTreeNode {
  id: string;
  name: string;
  class?: string;
  textClass?: string;
  depthOffset?: number;
  marriages?: DTreeMarriage[];
  extra?: Record<string, unknown>;
}

export interface DTreeMarriage {
  spouse?: DTreeNode;
  children?: DTreeNode[];
  extra?: Record<string, unknown>;
}

// Internal helper types
interface PersonInfo {
  id: string;
  displayName: string;
  pronouns: string | null;
  birthDate: string | null;
  deathDate: string | null;
  birthLocation: string | null;
}

interface SpouseRelation {
  spouseId: string;
  type: string;
  startDate: string | null;
  endDate: string | null;
}

/**
 * Transform our data model into dTree nodes.
 * Returns an array with a single root node for the tree.
 */
export function transformToDTreeData(
  persons: Person[],
  relationships: Relationship[],
): DTreeNode[] {
  const parentTypes = new Set([
    "biological_parent",
    "adoptive_parent",
    "step_parent",
  ]);
  const spouseTypes = new Set(["spouse", "ex_spouse", "partner"]);

  // Build lookup maps
  const personMap = new Map<string, PersonInfo>();
  for (const p of persons) {
    personMap.set(p.id, {
      id: p.id,
      displayName: p.display_name,
      pronouns: p.pronouns,
      birthDate: p.birth_date,
      deathDate: p.death_date,
      birthLocation: p.birth_location,
    });
  }

  const personIds = new Set(persons.map((p) => p.id));

  // Build parent-child relationships
  // Map: childId -> list of parentIds
  const childToParents = new Map<string, string[]>();
  // Map: parentId -> list of childIds
  const parentToChildren = new Map<string, string[]>();

  for (const rel of relationships) {
    if (!personIds.has(rel.person_a) || !personIds.has(rel.person_b)) continue;

    if (parentTypes.has(rel.type)) {
      // person_a is parent, person_b is child
      const parentId = rel.person_a;
      const childId = rel.person_b;

      if (!childToParents.has(childId)) childToParents.set(childId, []);
      childToParents.get(childId)!.push(parentId);

      if (!parentToChildren.has(parentId)) parentToChildren.set(parentId, []);
      parentToChildren.get(parentId)!.push(childId);
    }
  }

  // Build spouse relationships (bidirectional)
  // Map: personId -> list of spouse relations
  const personSpouses = new Map<string, SpouseRelation[]>();

  for (const rel of relationships) {
    if (!personIds.has(rel.person_a) || !personIds.has(rel.person_b)) continue;

    if (spouseTypes.has(rel.type)) {
      // Add bidirectional
      if (!personSpouses.has(rel.person_a))
        personSpouses.set(rel.person_a, []);
      personSpouses.get(rel.person_a)!.push({
        spouseId: rel.person_b,
        type: rel.type,
        startDate: rel.start_date,
        endDate: rel.end_date,
      });

      if (!personSpouses.has(rel.person_b))
        personSpouses.set(rel.person_b, []);
      personSpouses.get(rel.person_b)!.push({
        spouseId: rel.person_a,
        type: rel.type,
        startDate: rel.start_date,
        endDate: rel.end_date,
      });
    }
  }

  // Find children shared between two parents (for marriage grouping)
  function getSharedChildren(parent1: string, parent2: string): string[] {
    const children1 = new Set(parentToChildren.get(parent1) ?? []);
    const children2 = parentToChildren.get(parent2) ?? [];
    return children2.filter((c) => children1.has(c));
  }

  // Find root persons (no parents)
  const roots = persons.filter(
    (p) =>
      !childToParents.has(p.id) || childToParents.get(p.id)!.length === 0,
  );

  // If no roots found, pick the person with most descendants
  let rootPerson: Person;
  if (roots.length === 0) {
    // Find person with most connections
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
    let bestId = persons[0]?.id;
    let bestCount = 0;
    for (const [id, count] of connectionCount) {
      if (count > bestCount && personIds.has(id)) {
        bestId = id;
        bestCount = count;
      }
    }
    rootPerson = persons.find((p) => p.id === bestId) ?? persons[0];
  } else {
    // Find the root with most descendants
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
    rootPerson = bestRoot;
  }

  if (!rootPerson) {
    return [];
  }

  // Build tree recursively
  const visited = new Set<string>();
  const processedAsSpouse = new Set<string>();

  function buildNode(personId: string): DTreeNode | null {
    if (visited.has(personId)) return null;

    const person = personMap.get(personId);
    if (!person) return null;

    visited.add(personId);

    const node: DTreeNode = {
      id: person.id,
      name: person.displayName,
      class: "dtree-node",
      textClass: "dtree-text",
      extra: {
        pronouns: person.pronouns,
        birthDate: person.birthDate,
        deathDate: person.deathDate,
        birthLocation: person.birthLocation,
      },
      marriages: [],
    };

    // Get spouses
    const spouses = personSpouses.get(personId) ?? [];
    const myChildren = parentToChildren.get(personId) ?? [];
    const assignedChildren = new Set<string>();

    // Process each spouse
    for (const spouseRel of spouses) {
      if (processedAsSpouse.has(spouseRel.spouseId)) continue;

      const spousePerson = personMap.get(spouseRel.spouseId);
      if (!spousePerson) continue;

      // Find shared children
      const sharedChildren = getSharedChildren(personId, spouseRel.spouseId);

      // Build children nodes for this marriage
      const marriageChildren: DTreeNode[] = [];
      for (const childId of sharedChildren) {
        if (assignedChildren.has(childId)) continue;
        assignedChildren.add(childId);

        const childNode = buildNode(childId);
        if (childNode) {
          marriageChildren.push(childNode);
        }
      }

      // Mark spouse as processed to prevent them being added as a root later
      processedAsSpouse.add(spouseRel.spouseId);

      // Create spouse node (without marriages to prevent infinite recursion)
      const spouseNode: DTreeNode = {
        id: spousePerson.id,
        name: spousePerson.displayName,
        class: "dtree-node dtree-spouse",
        textClass: "dtree-text",
        extra: {
          pronouns: spousePerson.pronouns,
          birthDate: spousePerson.birthDate,
          deathDate: spousePerson.deathDate,
          birthLocation: spousePerson.birthLocation,
          relationshipType: spouseRel.type,
        },
      };

      node.marriages!.push({
        spouse: spouseNode,
        children: marriageChildren.length > 0 ? marriageChildren : undefined,
        extra: {
          type: spouseRel.type,
          startDate: spouseRel.startDate,
          endDate: spouseRel.endDate,
        },
      });
    }

    // Handle children without spouse (single parent)
    const unassignedChildren: DTreeNode[] = [];
    for (const childId of myChildren) {
      if (assignedChildren.has(childId)) continue;

      const childNode = buildNode(childId);
      if (childNode) {
        unassignedChildren.push(childNode);
      }
    }

    if (unassignedChildren.length > 0) {
      // Add a "marriage" without spouse for single-parent children
      node.marriages!.push({
        children: unassignedChildren,
      });
    }

    return node;
  }

  const rootNode = buildNode(rootPerson.id);

  return rootNode ? [rootNode] : [];
}

/**
 * Get a formatted display string for dates
 */
export function formatLifespan(
  birthDate: string | null | undefined,
  deathDate: string | null | undefined,
): string {
  if (!birthDate && !deathDate) return "";

  const birth = birthDate ? birthDate.split("-")[0] : "?";
  const death = deathDate ? deathDate.split("-")[0] : "";

  if (death) {
    return `${birth}–${death}`;
  } else if (birthDate) {
    return `b. ${birth}`;
  }
  return "";
}

/**
 * Transform our data model into a simple hierarchical tree format.
 * Each node combines a person with their spouse (if any) into a single display name.
 *
 * This matches the original working tree format from the exported JSON:
 * "John McGinty (1870-1909) & Margaret Kirk (1871-1906)"
 */
export function transformToHierarchicalTree(
  persons: Person[],
  relationships: Relationship[],
): TreeDisplayNode[] {
  const parentTypes = new Set([
    "biological_parent",
    "adoptive_parent",
    "step_parent",
  ]);
  const spouseTypes = new Set(["spouse", "ex_spouse", "partner"]);

  // Build lookup maps
  const personMap = new Map<string, Person>();
  for (const p of persons) {
    personMap.set(p.id, p);
  }
  const personIds = new Set(persons.map((p) => p.id));

  // Build parent-child relationships
  const childToParents = new Map<string, string[]>();
  const parentToChildren = new Map<string, string[]>();

  for (const rel of relationships) {
    if (!personIds.has(rel.person_a) || !personIds.has(rel.person_b)) continue;
    if (!parentTypes.has(rel.type)) continue;

    const parentId = rel.person_a;
    const childId = rel.person_b;

    if (!childToParents.has(childId)) childToParents.set(childId, []);
    childToParents.get(childId)!.push(parentId);

    if (!parentToChildren.has(parentId)) parentToChildren.set(parentId, []);
    parentToChildren.get(parentId)!.push(childId);
  }

  // Build spouse relationships (we'll use first spouse found for each person)
  const personSpouse = new Map<string, { spouseId: string; type: string }>();

  for (const rel of relationships) {
    if (!personIds.has(rel.person_a) || !personIds.has(rel.person_b)) continue;
    if (!spouseTypes.has(rel.type)) continue;

    // Only store one spouse per person (first one found)
    if (!personSpouse.has(rel.person_a)) {
      personSpouse.set(rel.person_a, { spouseId: rel.person_b, type: rel.type });
    }
    if (!personSpouse.has(rel.person_b)) {
      personSpouse.set(rel.person_b, { spouseId: rel.person_a, type: rel.type });
    }
  }

  // Find children shared between two parents
  function getSharedChildren(parent1: string, parent2: string): string[] {
    const children1 = new Set(parentToChildren.get(parent1) ?? []);
    const children2 = parentToChildren.get(parent2) ?? [];
    return children2.filter((c) => children1.has(c));
  }

  // Find root persons (no parents in the data)
  const roots = persons.filter(
    (p) => !childToParents.has(p.id) || childToParents.get(p.id)!.length === 0,
  );

  // Pick best root (most descendants, oldest birth date as tiebreaker)
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

  // Helper to get birth year as number (for sorting)
  function getBirthYear(person: Person): number {
    if (!person.birth_date) return 9999; // Unknown = sort last
    const year = parseInt(person.birth_date.split("-")[0], 10);
    return isNaN(year) ? 9999 : year;
  }

  let rootPerson: Person | null = null;
  if (roots.length === 0) {
    // No clear root - pick person with most connections
    const connectionCount = new Map<string, number>();
    for (const rel of relationships) {
      connectionCount.set(rel.person_a, (connectionCount.get(rel.person_a) ?? 0) + 1);
      connectionCount.set(rel.person_b, (connectionCount.get(rel.person_b) ?? 0) + 1);
    }
    let bestId = persons[0]?.id;
    let bestCount = 0;
    for (const [id, count] of connectionCount) {
      if (count > bestCount && personIds.has(id)) {
        bestId = id;
        bestCount = count;
      }
    }
    rootPerson = persons.find((p) => p.id === bestId) ?? persons[0] ?? null;
  } else {
    // Score each root: descendants count + bonus for earlier birth year
    // This ensures the oldest ancestor with descendants becomes root
    interface RootCandidate {
      person: Person;
      descendants: number;
      birthYear: number;
    }

    const candidates: RootCandidate[] = [];
    for (const root of roots) {
      const descendants = countDescendants(root.id, new Set());
      // Only consider roots that have descendants (parents)
      if (descendants > 0) {
        candidates.push({
          person: root,
          descendants,
          birthYear: getBirthYear(root),
        });
      }
    }

    if (candidates.length > 0) {
      // Sort by: 1) descendants (desc), 2) birth year (asc - older first), 3) name reverse-alpha
      // Note: Prefer names later in alphabet as a heuristic (surnames starting with M-Z)
      candidates.sort((a, b) => {
        // Primary: more descendants is better
        if (b.descendants !== a.descendants) {
          return b.descendants - a.descendants;
        }
        // Secondary: earlier birth year is better
        if (a.birthYear !== b.birthYear) {
          return a.birthYear - b.birthYear;
        }
        // Tertiary: reverse alphabetical (prefer M-Z over A-L as rough heuristic)
        return b.person.display_name.localeCompare(a.person.display_name);
      });

      rootPerson = candidates[0].person;

      // Log selected root for debugging (can be removed later)
      console.log("Tree root selected:", rootPerson?.display_name);
    } else {
      // Fallback: pick the oldest person with no parents
      roots.sort((a, b) => getBirthYear(a) - getBirthYear(b));
      rootPerson = roots[0] ?? null;
    }
  }

  if (!rootPerson) return [];

  // Build tree recursively, tracking which persons we've processed
  const processedPersons = new Set<string>();
  let nodeCounter = 0;

  function formatPersonName(person: Person): string {
    let name = person.display_name;
    const lifespan = formatLifespan(person.birth_date, person.death_date);
    if (lifespan) {
      name += ` (${lifespan})`;
    }
    return name;
  }

  function buildNode(personId: string): TreeDisplayNode | null {
    if (processedPersons.has(personId)) return null;

    const person = personMap.get(personId);
    if (!person) return null;

    processedPersons.add(personId);

    // Build the node name (person + spouse if any)
    let nodeName = formatPersonName(person);
    const spouseRel = personSpouse.get(personId);
    const childrenSourceIds: string[] = [personId];

    if (spouseRel && !processedPersons.has(spouseRel.spouseId)) {
      const spouse = personMap.get(spouseRel.spouseId);
      if (spouse) {
        processedPersons.add(spouseRel.spouseId);
        const separator = spouseRel.type === "ex_spouse" ? " & " : " & ";
        nodeName += separator + formatPersonName(spouse);
        childrenSourceIds.push(spouseRel.spouseId);
      }
    }

    const nodeId = `n-${nodeCounter++}`;

    // Collect all children of this family unit
    const childIdsSet = new Set<string>();
    for (const parentId of childrenSourceIds) {
      const children = parentToChildren.get(parentId) ?? [];
      for (const childId of children) {
        childIdsSet.add(childId);
      }
    }

    // Build children nodes
    const childNodes: TreeDisplayNode[] = [];
    for (const childId of childIdsSet) {
      const childNode = buildNode(childId);
      if (childNode) {
        childNodes.push(childNode);
      }
    }

    return {
      id: nodeId,
      name: nodeName,
      personIds: childrenSourceIds,
      children: childNodes,
    };
  }

  const rootNode = buildNode(rootPerson.id);
  return rootNode ? [rootNode] : [];
}
