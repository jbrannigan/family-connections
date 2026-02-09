import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Inline stack logic for unit testing ─────────────────────
// We test the core stack mechanics without React rendering.

interface UndoEntry {
  id: string;
  description: string;
  timestamp: number;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

const MAX_STACK_SIZE = 20;

class UndoStack {
  undoStack: UndoEntry[] = [];
  redoStack: UndoEntry[] = [];

  pushAction(entry: Omit<UndoEntry, "id" | "timestamp">) {
    const fullEntry: UndoEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    this.undoStack.push(fullEntry);
    if (this.undoStack.length > MAX_STACK_SIZE) {
      this.undoStack = this.undoStack.slice(
        this.undoStack.length - MAX_STACK_SIZE,
      );
    }
    // New action clears redo stack
    this.redoStack = [];
  }

  async performUndo(): Promise<boolean> {
    if (this.undoStack.length === 0) return false;
    const entry = this.undoStack.pop()!;
    await entry.undo();
    this.redoStack.push(entry);
    if (this.redoStack.length > MAX_STACK_SIZE) {
      this.redoStack = this.redoStack.slice(
        this.redoStack.length - MAX_STACK_SIZE,
      );
    }
    return true;
  }

  async performRedo(): Promise<boolean> {
    if (this.redoStack.length === 0) return false;
    const entry = this.redoStack.pop()!;
    await entry.redo();
    this.undoStack.push(entry);
    if (this.undoStack.length > MAX_STACK_SIZE) {
      this.undoStack = this.undoStack.slice(
        this.undoStack.length - MAX_STACK_SIZE,
      );
    }
    return true;
  }

  get canUndo() {
    return this.undoStack.length > 0;
  }
  get canRedo() {
    return this.redoStack.length > 0;
  }
  get undoDescription() {
    return this.undoStack.length > 0
      ? this.undoStack[this.undoStack.length - 1].description
      : null;
  }
  get redoDescription() {
    return this.redoStack.length > 0
      ? this.redoStack[this.redoStack.length - 1].description
      : null;
  }

  clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}

// ── Helper ──────────────────────────────────────────────────

function makeEntry(
  description: string,
  undoFn?: () => Promise<void>,
  redoFn?: () => Promise<void>,
): Omit<UndoEntry, "id" | "timestamp"> {
  return {
    description,
    undo: undoFn ?? (async () => {}),
    redo: redoFn ?? (async () => {}),
  };
}

// ── Tests ───────────────────────────────────────────────────

describe("UndoStack", () => {
  let stack: UndoStack;

  beforeEach(() => {
    stack = new UndoStack();
  });

  it("starts with empty stacks", () => {
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
    expect(stack.undoDescription).toBeNull();
    expect(stack.redoDescription).toBeNull();
  });

  it("pushAction adds to undo stack", () => {
    stack.pushAction(makeEntry("Edit person"));
    expect(stack.canUndo).toBe(true);
    expect(stack.undoDescription).toBe("Edit person");
  });

  it("pushAction clears redo stack", async () => {
    stack.pushAction(makeEntry("Action 1"));
    await stack.performUndo();
    expect(stack.canRedo).toBe(true);

    stack.pushAction(makeEntry("Action 2"));
    expect(stack.canRedo).toBe(false);
  });

  it("performUndo calls the undo function", async () => {
    const undoFn = vi.fn(async () => {});
    stack.pushAction(makeEntry("Edit person", undoFn));

    await stack.performUndo();
    expect(undoFn).toHaveBeenCalledOnce();
  });

  it("performUndo moves entry to redo stack", async () => {
    stack.pushAction(makeEntry("Edit person"));
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(false);

    await stack.performUndo();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(true);
    expect(stack.redoDescription).toBe("Edit person");
  });

  it("performRedo calls the redo function", async () => {
    const redoFn = vi.fn(async () => {});
    stack.pushAction(makeEntry("Edit person", undefined, redoFn));
    await stack.performUndo();

    await stack.performRedo();
    expect(redoFn).toHaveBeenCalledOnce();
  });

  it("performRedo moves entry back to undo stack", async () => {
    stack.pushAction(makeEntry("Edit person"));
    await stack.performUndo();
    expect(stack.canRedo).toBe(true);

    await stack.performRedo();
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(false);
  });

  it("performUndo on empty stack does nothing", async () => {
    const result = await stack.performUndo();
    expect(result).toBe(false);
  });

  it("performRedo on empty stack does nothing", async () => {
    const result = await stack.performRedo();
    expect(result).toBe(false);
  });

  it("caps undo stack at 20 entries", () => {
    for (let i = 0; i < 25; i++) {
      stack.pushAction(makeEntry(`Action ${i}`));
    }
    expect(stack.undoStack.length).toBe(20);
    // Should have the most recent 20 (5–24)
    expect(stack.undoDescription).toBe("Action 24");
    expect(stack.undoStack[0].description).toBe("Action 5");
  });

  it("undoes in LIFO order", async () => {
    stack.pushAction(makeEntry("First"));
    stack.pushAction(makeEntry("Second"));
    stack.pushAction(makeEntry("Third"));

    expect(stack.undoDescription).toBe("Third");
    await stack.performUndo();
    expect(stack.undoDescription).toBe("Second");
    await stack.performUndo();
    expect(stack.undoDescription).toBe("First");
  });

  it("redo replays in order", async () => {
    stack.pushAction(makeEntry("First"));
    stack.pushAction(makeEntry("Second"));

    await stack.performUndo();
    await stack.performUndo();

    expect(stack.redoDescription).toBe("First");
    await stack.performRedo();
    expect(stack.redoDescription).toBe("Second");
  });

  it("clear resets both stacks", () => {
    stack.pushAction(makeEntry("Action 1"));
    stack.pushAction(makeEntry("Action 2"));
    stack.performUndo();

    stack.clear();
    expect(stack.canUndo).toBe(false);
    expect(stack.canRedo).toBe(false);
  });

  it("multiple undo/redo cycles work correctly", async () => {
    const undoFn = vi.fn(async () => {});
    const redoFn = vi.fn(async () => {});
    stack.pushAction(makeEntry("Edit", undoFn, redoFn));

    await stack.performUndo();
    await stack.performRedo();
    await stack.performUndo();
    await stack.performRedo();

    expect(undoFn).toHaveBeenCalledTimes(2);
    expect(redoFn).toHaveBeenCalledTimes(2);
    expect(stack.canUndo).toBe(true);
    expect(stack.canRedo).toBe(false);
  });
});
