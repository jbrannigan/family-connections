import { describe, it, expect } from "vitest";
import {
  findParentNode,
  findFirstChild,
  findNextSibling,
  keyToAction,
  buildNodeMap,
  type HierarchyNode,
  type NodeMap,
} from "./tree-keyboard-nav";

// ── Test tree structure ─────────────────────────────────
//
//       root (n-0)
//      /    \
//   a (n-1)  b (n-2)
//   /  \
// c (n-3) d (n-4)
//

function makeNode(
  id: string,
  children: HierarchyNode[] = [],
): HierarchyNode {
  const node: HierarchyNode = {
    data: { id, name: id, personIds: [`p-${id}`], unionType: null, children: [] },
    parent: null,
    children: children.length > 0 ? children : undefined,
  };
  // Wire up parent pointers
  if (children.length > 0) {
    for (const child of children) {
      child.parent = node;
    }
  }
  return node;
}

function buildTestTree(): { root: HierarchyNode; nodeMap: NodeMap } {
  const c = makeNode("n-3");
  const d = makeNode("n-4");
  const a = makeNode("n-1", [c, d]);
  const b = makeNode("n-2");
  const root = makeNode("n-0", [a, b]);
  const nodeMap = buildNodeMap(root);
  return { root, nodeMap };
}

// ── findParentNode ──────────────────────────────────────

describe("findParentNode", () => {
  it("returns null for root node", () => {
    const { nodeMap } = buildTestTree();
    expect(findParentNode(nodeMap, "n-0")).toBeNull();
  });

  it("returns parent id for child node", () => {
    const { nodeMap } = buildTestTree();
    expect(findParentNode(nodeMap, "n-1")).toBe("n-0");
    expect(findParentNode(nodeMap, "n-2")).toBe("n-0");
  });

  it("returns parent id for grandchild", () => {
    const { nodeMap } = buildTestTree();
    expect(findParentNode(nodeMap, "n-3")).toBe("n-1");
    expect(findParentNode(nodeMap, "n-4")).toBe("n-1");
  });

  it("returns null for unknown node id", () => {
    const { nodeMap } = buildTestTree();
    expect(findParentNode(nodeMap, "nonexistent")).toBeNull();
  });
});

// ── findFirstChild ──────────────────────────────────────

describe("findFirstChild", () => {
  it("returns first child id", () => {
    const { nodeMap } = buildTestTree();
    expect(findFirstChild(nodeMap, "n-0")).toBe("n-1");
    expect(findFirstChild(nodeMap, "n-1")).toBe("n-3");
  });

  it("returns null for leaf node", () => {
    const { nodeMap } = buildTestTree();
    expect(findFirstChild(nodeMap, "n-3")).toBeNull();
    expect(findFirstChild(nodeMap, "n-4")).toBeNull();
    expect(findFirstChild(nodeMap, "n-2")).toBeNull();
  });

  it("returns null for unknown node id", () => {
    const { nodeMap } = buildTestTree();
    expect(findFirstChild(nodeMap, "nonexistent")).toBeNull();
  });
});

// ── findNextSibling ─────────────────────────────────────

describe("findNextSibling", () => {
  it("returns next sibling", () => {
    const { nodeMap } = buildTestTree();
    expect(findNextSibling(nodeMap, "n-1", 1)).toBe("n-2");
    expect(findNextSibling(nodeMap, "n-3", 1)).toBe("n-4");
  });

  it("returns previous sibling", () => {
    const { nodeMap } = buildTestTree();
    expect(findNextSibling(nodeMap, "n-2", -1)).toBe("n-1");
    expect(findNextSibling(nodeMap, "n-4", -1)).toBe("n-3");
  });

  it("returns null at start of sibling list", () => {
    const { nodeMap } = buildTestTree();
    expect(findNextSibling(nodeMap, "n-1", -1)).toBeNull();
    expect(findNextSibling(nodeMap, "n-3", -1)).toBeNull();
  });

  it("returns null at end of sibling list", () => {
    const { nodeMap } = buildTestTree();
    expect(findNextSibling(nodeMap, "n-2", 1)).toBeNull();
    expect(findNextSibling(nodeMap, "n-4", 1)).toBeNull();
  });

  it("returns null for root (no parent = no siblings)", () => {
    const { nodeMap } = buildTestTree();
    expect(findNextSibling(nodeMap, "n-0", 1)).toBeNull();
    expect(findNextSibling(nodeMap, "n-0", -1)).toBeNull();
  });

  it("returns null for only child", () => {
    // Build tree with single child
    const child = makeNode("c-0");
    const root = makeNode("r-0", [child]);
    const nodeMap = buildNodeMap(root);
    expect(findNextSibling(nodeMap, "c-0", 1)).toBeNull();
    expect(findNextSibling(nodeMap, "c-0", -1)).toBeNull();
  });
});

// ── buildNodeMap ────────────────────────────────────────

describe("buildNodeMap", () => {
  it("contains all nodes", () => {
    const { nodeMap } = buildTestTree();
    expect(nodeMap.size).toBe(5);
    expect(nodeMap.has("n-0")).toBe(true);
    expect(nodeMap.has("n-1")).toBe(true);
    expect(nodeMap.has("n-2")).toBe(true);
    expect(nodeMap.has("n-3")).toBe(true);
    expect(nodeMap.has("n-4")).toBe(true);
  });

  it("works with single node tree", () => {
    const root = makeNode("solo");
    const nodeMap = buildNodeMap(root);
    expect(nodeMap.size).toBe(1);
    expect(nodeMap.has("solo")).toBe(true);
  });
});

// ── keyToAction ─────────────────────────────────────────

describe("keyToAction", () => {
  describe("vertical orientation", () => {
    it("maps ArrowUp to parent", () => {
      expect(keyToAction("ArrowUp", "vertical")).toBe("parent");
    });
    it("maps ArrowDown to child", () => {
      expect(keyToAction("ArrowDown", "vertical")).toBe("child");
    });
    it("maps ArrowLeft to prevSibling", () => {
      expect(keyToAction("ArrowLeft", "vertical")).toBe("prevSibling");
    });
    it("maps ArrowRight to nextSibling", () => {
      expect(keyToAction("ArrowRight", "vertical")).toBe("nextSibling");
    });
  });

  describe("horizontal orientation", () => {
    it("maps ArrowLeft to parent", () => {
      expect(keyToAction("ArrowLeft", "horizontal")).toBe("parent");
    });
    it("maps ArrowRight to child", () => {
      expect(keyToAction("ArrowRight", "horizontal")).toBe("child");
    });
    it("maps ArrowUp to prevSibling", () => {
      expect(keyToAction("ArrowUp", "horizontal")).toBe("prevSibling");
    });
    it("maps ArrowDown to nextSibling", () => {
      expect(keyToAction("ArrowDown", "horizontal")).toBe("nextSibling");
    });
  });

  it("maps Enter to activate", () => {
    expect(keyToAction("Enter", "vertical")).toBe("activate");
    expect(keyToAction("Enter", "horizontal")).toBe("activate");
  });

  it("maps Escape to clearFocus", () => {
    expect(keyToAction("Escape", "vertical")).toBe("clearFocus");
    expect(keyToAction("Escape", "horizontal")).toBe("clearFocus");
  });

  it("returns null for unmapped keys", () => {
    expect(keyToAction("Space", "vertical")).toBeNull();
    expect(keyToAction("Tab", "horizontal")).toBeNull();
    expect(keyToAction("a", "vertical")).toBeNull();
  });
});
