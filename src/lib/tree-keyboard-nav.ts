/**
 * Pure traversal helpers for keyboard navigation in the tree view.
 *
 * These operate on a node map built from D3's hierarchy, where each entry
 * has `.parent` and `.children` pointers.  All functions return a
 * TreeDisplayNode `id` (e.g. "n-0") or null when navigation is impossible.
 */

import type { TreeDisplayNode } from "./dtree-transform";

/** Minimal D3 hierarchy node shape used by the helpers. */
export interface HierarchyNode {
  data: TreeDisplayNode;
  parent: HierarchyNode | null;
  children: HierarchyNode[] | undefined;
}

export type NodeMap = Map<string, HierarchyNode>;

/** Return the parent node's id, or null if this is the root. */
export function findParentNode(
  nodeMap: NodeMap,
  nodeId: string,
): string | null {
  const node = nodeMap.get(nodeId);
  if (!node?.parent) return null;
  return node.parent.data.id;
}

/** Return the first child's id, or null if this is a leaf. */
export function findFirstChild(
  nodeMap: NodeMap,
  nodeId: string,
): string | null {
  const node = nodeMap.get(nodeId);
  if (!node?.children || node.children.length === 0) return null;
  return node.children[0].data.id;
}

/**
 * Return the adjacent sibling's id.
 *
 * @param direction  1 = next sibling, -1 = previous sibling
 * @returns sibling id, or null if at the edge (or root with no siblings)
 */
export function findNextSibling(
  nodeMap: NodeMap,
  nodeId: string,
  direction: 1 | -1,
): string | null {
  const node = nodeMap.get(nodeId);
  if (!node?.parent?.children) return null;

  const siblings = node.parent.children;
  const idx = siblings.findIndex((c) => c.data.id === nodeId);
  if (idx === -1) return null;

  const nextIdx = idx + direction;
  if (nextIdx < 0 || nextIdx >= siblings.length) return null;
  return siblings[nextIdx].data.id;
}

/**
 * Map a keyboard arrow key to a logical tree action, taking orientation
 * into account.
 *
 * Vertical layout (top-to-bottom): Up/Down = hierarchy, Left/Right = siblings
 * Horizontal layout (left-to-right): Left/Right = hierarchy, Up/Down = siblings
 */
export type TreeAction =
  | "parent"
  | "child"
  | "prevSibling"
  | "nextSibling"
  | "activate"
  | "clearFocus";

export function keyToAction(
  key: string,
  orientation: "vertical" | "horizontal",
): TreeAction | null {
  if (key === "Enter") return "activate";
  if (key === "Escape") return "clearFocus";

  if (orientation === "vertical") {
    switch (key) {
      case "ArrowUp":
        return "parent";
      case "ArrowDown":
        return "child";
      case "ArrowLeft":
        return "prevSibling";
      case "ArrowRight":
        return "nextSibling";
    }
  } else {
    switch (key) {
      case "ArrowLeft":
        return "parent";
      case "ArrowRight":
        return "child";
      case "ArrowUp":
        return "prevSibling";
      case "ArrowDown":
        return "nextSibling";
    }
  }

  return null;
}

/**
 * Build a NodeMap from a D3 hierarchy root by iterating all descendants.
 */
export function buildNodeMap(root: HierarchyNode): NodeMap {
  const map: NodeMap = new Map();

  function walk(node: HierarchyNode) {
    map.set(node.data.id, node);
    if (node.children) {
      for (const child of node.children) {
        walk(child);
      }
    }
  }

  walk(root);
  return map;
}
