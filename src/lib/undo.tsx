"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";

// ── Types ─────────────────────────────────────────────────

export interface UndoEntry {
  /** Unique ID for this entry */
  id: string;
  /** Human-readable description (e.g. "Updated John Smith") */
  description: string;
  /** Timestamp when the action was performed */
  timestamp: number;
  /** Function to reverse the action */
  undo: () => Promise<void>;
  /** Function to re-apply the action */
  redo: () => Promise<void>;
}

export interface UndoToast {
  message: string;
  type: "undo" | "redo";
}

// ── Constants ─────────────────────────────────────────────

const MAX_STACK_SIZE = 20;
const TOAST_DURATION_MS = 5000;

// ── Context ───────────────────────────────────────────────

interface UndoContextValue {
  /** Push a new undoable action onto the stack */
  pushAction: (entry: Omit<UndoEntry, "id" | "timestamp">) => void;
  /** Undo the most recent action */
  performUndo: () => Promise<void>;
  /** Redo the most recently undone action */
  performRedo: () => Promise<void>;
  /** Whether there are actions to undo */
  canUndo: boolean;
  /** Whether there are actions to redo */
  canRedo: boolean;
  /** Description of the action that would be undone */
  undoDescription: string | null;
  /** Description of the action that would be redone */
  redoDescription: string | null;
  /** Whether an undo/redo operation is currently in progress */
  isProcessing: boolean;
  /** Current toast notification (if any) */
  toast: UndoToast | null;
  /** Dismiss the current toast */
  dismissToast: () => void;
}

const UndoContext = createContext<UndoContextValue>({
  pushAction: () => {},
  performUndo: async () => {},
  performRedo: async () => {},
  canUndo: false,
  canRedo: false,
  undoDescription: null,
  redoDescription: null,
  isProcessing: false,
  toast: null,
  dismissToast: () => {},
});

export function useUndo() {
  return useContext(UndoContext);
}

// ── Provider ──────────────────────────────────────────────

interface UndoProviderProps {
  graphId: string;
  children: ReactNode;
}

export function UndoProvider({ graphId, children }: UndoProviderProps) {
  const [undoStack, setUndoStack] = useState<UndoEntry[]>([]);
  const [redoStack, setRedoStack] = useState<UndoEntry[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [toast, setToast] = useState<UndoToast | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevGraphIdRef = useRef(graphId);

  // Clear stacks when navigating to a different graph
  useEffect(() => {
    if (prevGraphIdRef.current !== graphId) {
      setUndoStack([]);
      setRedoStack([]);
      setToast(null);
      prevGraphIdRef.current = graphId;
    }
  }, [graphId]);

  // ── Toast helpers ───────────────────────────────────────

  const showToast = useCallback((message: string, type: "undo" | "redo") => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }
    setToast({ message, type });
    toastTimerRef.current = setTimeout(() => {
      setToast(null);
      toastTimerRef.current = null;
    }, TOAST_DURATION_MS);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
    setToast(null);
  }, []);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  // ── Stack operations ────────────────────────────────────

  const pushAction = useCallback(
    (entry: Omit<UndoEntry, "id" | "timestamp">) => {
      const fullEntry: UndoEntry = {
        ...entry,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
      };
      setUndoStack((prev) => {
        const next = [...prev, fullEntry];
        // Cap at MAX_STACK_SIZE — drop oldest entries
        return next.length > MAX_STACK_SIZE
          ? next.slice(next.length - MAX_STACK_SIZE)
          : next;
      });
      // New action clears redo stack
      setRedoStack([]);
      showToast(entry.description, "undo");
    },
    [showToast],
  );

  const performUndo = useCallback(async () => {
    if (isProcessing || undoStack.length === 0) return;

    const entry = undoStack[undoStack.length - 1];
    setIsProcessing(true);

    try {
      await entry.undo();
      setUndoStack((prev) => prev.slice(0, -1));
      setRedoStack((prev) => {
        const next = [...prev, entry];
        return next.length > MAX_STACK_SIZE
          ? next.slice(next.length - MAX_STACK_SIZE)
          : next;
      });
      showToast(`Undid: ${entry.description}`, "undo");
    } catch {
      showToast(`Failed to undo: ${entry.description}`, "undo");
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, undoStack, showToast]);

  const performRedo = useCallback(async () => {
    if (isProcessing || redoStack.length === 0) return;

    const entry = redoStack[redoStack.length - 1];
    setIsProcessing(true);

    try {
      await entry.redo();
      setRedoStack((prev) => prev.slice(0, -1));
      setUndoStack((prev) => {
        const next = [...prev, entry];
        return next.length > MAX_STACK_SIZE
          ? next.slice(next.length - MAX_STACK_SIZE)
          : next;
      });
      showToast(`Redid: ${entry.description}`, "redo");
    } catch {
      showToast(`Failed to redo: ${entry.description}`, "redo");
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, redoStack, showToast]);

  // ── Keyboard shortcuts ──────────────────────────────────

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod || e.key.toLowerCase() !== "z") return;

      // Don't intercept native undo/redo inside text inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      e.preventDefault();

      if (e.shiftKey) {
        performRedo();
      } else {
        performUndo();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [performUndo, performRedo]);

  // ── Derived state ───────────────────────────────────────

  const canUndo = undoStack.length > 0 && !isProcessing;
  const canRedo = redoStack.length > 0 && !isProcessing;
  const undoDescription =
    undoStack.length > 0 ? undoStack[undoStack.length - 1].description : null;
  const redoDescription =
    redoStack.length > 0 ? redoStack[redoStack.length - 1].description : null;

  return (
    <UndoContext.Provider
      value={{
        pushAction,
        performUndo,
        performRedo,
        canUndo,
        canRedo,
        undoDescription,
        redoDescription,
        isProcessing,
        toast,
        dismissToast,
      }}
    >
      {children}
    </UndoContext.Provider>
  );
}
