/**
 * Relationship path finder.
 *
 * Given a list of parent-child edges, finds the path between two people
 * and computes the kinship label (e.g. "2nd cousin once removed").
 */

import type { Relationship } from "@/types/database";

interface Edge {
  parent: string;
  child: string;
}

/**
 * Extract parent-child edges from relationship records.
 * Only biological/adoptive/step parent types are relevant for kinship.
 */
export function extractParentEdges(relationships: Relationship[]): Edge[] {
  const parentTypes = new Set([
    "biological_parent",
    "adoptive_parent",
    "step_parent",
  ]);
  return relationships
    .filter((r) => parentTypes.has(r.type))
    .map((r) => ({ parent: r.person_a, child: r.person_b }));
}

/**
 * Build adjacency maps for traversal.
 */
function buildAdjacency(edges: Edge[]) {
  const parentOf = new Map<string, Set<string>>(); // child -> parents
  const childOf = new Map<string, Set<string>>(); // parent -> children

  for (const { parent, child } of edges) {
    if (!parentOf.has(child)) parentOf.set(child, new Set());
    parentOf.get(child)!.add(parent);

    if (!childOf.has(parent)) childOf.set(parent, new Set());
    childOf.get(parent)!.add(child);
  }

  return { parentOf, childOf };
}

/**
 * Find all ancestors of a person, with their generation distance.
 * Returns Map<ancestorId, generationsUp>.
 */
function findAncestors(
  personId: string,
  parentOf: Map<string, Set<string>>,
): Map<string, number> {
  const ancestors = new Map<string, number>();
  const queue: [string, number][] = [[personId, 0]];

  while (queue.length > 0) {
    const [current, gen] = queue.shift()!;
    const parents = parentOf.get(current);
    if (!parents) continue;

    for (const parent of parents) {
      if (!ancestors.has(parent)) {
        ancestors.set(parent, gen + 1);
        queue.push([parent, gen + 1]);
      }
    }
  }

  return ancestors;
}

export interface ConnectionPath {
  /** The common ancestor through whom the connection is made */
  commonAncestor: string;
  /** Path from person A up to common ancestor (IDs) */
  pathA: string[];
  /** Path from person B up to common ancestor (IDs) */
  pathB: string[];
  /** Generations from A to common ancestor */
  generationsA: number;
  /** Generations from B to common ancestor */
  generationsB: number;
  /** Human-readable label */
  label: string;
}

/**
 * Trace the path from a person up to an ancestor.
 */
function tracePath(
  from: string,
  to: string,
  parentOf: Map<string, Set<string>>,
): string[] {
  const visited = new Set<string>();
  const parent = new Map<string, string>();
  const queue = [from];
  visited.add(from);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === to) break;

    const parents = parentOf.get(current);
    if (!parents) continue;

    for (const p of parents) {
      if (!visited.has(p)) {
        visited.add(p);
        parent.set(p, current);
        queue.push(p);
      }
    }
  }

  const path: string[] = [];
  let current: string | undefined = to;
  while (current && current !== from) {
    path.unshift(current);
    current = parent.get(current);
  }
  path.unshift(from);
  return path;
}

/**
 * Compute kinship label from generation counts.
 */
function kinshipLabel(genA: number, genB: number): string {
  if (genA === 0 && genB === 0) return "same person";

  // Direct ancestor/descendant
  if (genA === 0 || genB === 0) {
    const gen = Math.max(genA, genB);
    const direction = genA === 0 ? "descendant" : "ancestor";
    if (gen === 1)
      return direction === "ancestor" ? "parent" : "child";
    if (gen === 2)
      return direction === "ancestor" ? "grandparent" : "grandchild";
    const greats = gen - 2;
    const prefix = greats === 1 ? "great-" : `${ordinal(greats)} great-`;
    return direction === "ancestor"
      ? `${prefix}grandparent`
      : `${prefix}grandchild`;
  }

  // Siblings
  if (genA === 1 && genB === 1) return "sibling";

  // Aunts/uncles/nieces/nephews
  if (genA === 1 || genB === 1) {
    const other = Math.max(genA, genB);
    const isUp = genA < genB;
    if (other === 2)
      return isUp ? "aunt/uncle" : "niece/nephew";
    const greats = other - 2;
    const prefix = greats === 1 ? "great-" : `${ordinal(greats)} great-`;
    return isUp ? `${prefix}aunt/uncle` : `${prefix}niece/nephew`;
  }

  // Cousins
  const cousinDegree = Math.min(genA, genB) - 1;
  const removed = Math.abs(genA - genB);
  const degreeStr = ordinal(cousinDegree);

  if (removed === 0) return `${degreeStr} cousin`;
  const removedStr = removed === 1 ? "once" : removed === 2 ? "twice" : `${removed} times`;
  return `${degreeStr} cousin ${removedStr} removed`;
}

function ordinal(n: number): string {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

/**
 * Find how two people are connected.
 * Returns null if no connection found.
 */
export function findConnection(
  personAId: string,
  personBId: string,
  relationships: Relationship[],
): ConnectionPath | null {
  if (personAId === personBId) return null;

  const edges = extractParentEdges(relationships);
  const { parentOf } = buildAdjacency(edges);

  const ancestorsA = findAncestors(personAId, parentOf);
  const ancestorsB = findAncestors(personBId, parentOf);

  // Find common ancestors (present in both ancestor sets)
  let bestAncestor: string | null = null;
  let bestTotal = Infinity;

  for (const [ancestor, genA] of ancestorsA) {
    const genB = ancestorsB.get(ancestor);
    if (genB !== undefined && genA + genB < bestTotal) {
      bestTotal = genA + genB;
      bestAncestor = ancestor;
    }
  }

  if (!bestAncestor) return null;

  const generationsA = ancestorsA.get(bestAncestor)!;
  const generationsB = ancestorsB.get(bestAncestor)!;

  return {
    commonAncestor: bestAncestor,
    pathA: tracePath(personAId, bestAncestor, parentOf),
    pathB: tracePath(personBId, bestAncestor, parentOf),
    generationsA,
    generationsB,
    label: kinshipLabel(generationsA, generationsB),
  };
}
