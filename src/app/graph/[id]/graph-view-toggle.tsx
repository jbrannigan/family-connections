"use client";

import { useState, useRef, useCallback, useMemo, useSyncExternalStore } from "react";
import PersonList from "./person-list";
import SimpleTreeView, {
  type SimpleTreeViewHandle,
  type TreeOrientation,
  type ConnectionStyle,
  type NodeStyle,
} from "./simple-tree-view";
import SearchInput from "./search-input";
import { searchPersons } from "@/lib/search";
import type { Person, Relationship } from "@/types/database";

type ViewMode = "tree" | "list";
type TreeViewMode = "full" | "ancestors" | "descendants";

interface TreeSettings {
  orientation: TreeOrientation;
  connectionStyle: ConnectionStyle;
  nodeStyle: NodeStyle;
}

const TREE_SETTINGS_KEY = "family-connections-tree-settings";

const DEFAULT_TREE_SETTINGS: TreeSettings = {
  orientation: "vertical",
  connectionStyle: "curved",
  nodeStyle: "detailed",
};

function parseTreeSettings(raw: string | null): TreeSettings {
  if (!raw) return DEFAULT_TREE_SETTINGS;
  try {
    const parsed = JSON.parse(raw);
    return {
      orientation: parsed.orientation === "horizontal" ? "horizontal" : "vertical",
      connectionStyle: parsed.connectionStyle === "right-angle" ? "right-angle" : "curved",
      nodeStyle: parsed.nodeStyle === "compact" ? "compact" : "detailed",
    };
  } catch {
    return DEFAULT_TREE_SETTINGS;
  }
}

// Cached snapshot for useSyncExternalStore (must return same reference if unchanged)
let cachedSettingsRaw: string | null = null;
let cachedSettings: TreeSettings = DEFAULT_TREE_SETTINGS;

function subscribeToTreeSettings(callback: () => void) {
  const handler = (e: StorageEvent) => {
    if (e.key === TREE_SETTINGS_KEY) callback();
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

function getTreeSettingsSnapshot(): TreeSettings {
  const raw = localStorage.getItem(TREE_SETTINGS_KEY);
  if (raw !== cachedSettingsRaw) {
    cachedSettingsRaw = raw;
    cachedSettings = parseTreeSettings(raw);
  }
  return cachedSettings;
}

function getTreeSettingsServerSnapshot(): TreeSettings {
  return DEFAULT_TREE_SETTINGS;
}

function saveTreeSettings(settings: TreeSettings) {
  try {
    localStorage.setItem(TREE_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

interface GraphViewToggleProps {
  graphId: string;
  persons: Person[];
  relationships: Relationship[];
  isAdmin: boolean;
  storyCountMap?: Record<string, number>;
}

export default function GraphViewToggle({
  graphId,
  persons,
  relationships,
  isAdmin,
  storyCountMap,
}: GraphViewToggleProps) {
  const [view, setView] = useState<ViewMode>("tree");
  const [searchQuery, setSearchQuery] = useState("");
  const treeRef = useRef<SimpleTreeViewHandle>(null);

  // Tree settings — synced from localStorage via useSyncExternalStore (SSR-safe)
  const treeSettingsFromStore = useSyncExternalStore(
    subscribeToTreeSettings,
    getTreeSettingsSnapshot,
    getTreeSettingsServerSnapshot
  );
  const [treeSettingsOverride, setTreeSettingsOverride] = useState<TreeSettings | null>(null);
  const treeSettings = treeSettingsOverride ?? treeSettingsFromStore;

  // Ephemeral tree view mode — not persisted
  const [treeViewMode, setTreeViewMode] = useState<TreeViewMode>("full");
  const [focusPersonId, setFocusPersonId] = useState<string | null>(null);

  // Resolve focus person's display name for the indicator
  const focusPersonName = useMemo(() => {
    if (!focusPersonId) return null;
    return persons.find((p) => p.id === focusPersonId)?.display_name ?? null;
  }, [focusPersonId, persons]);

  function updateTreeSettings(update: Partial<TreeSettings>) {
    const next = { ...treeSettings, ...update };
    saveTreeSettings(next);
    setTreeSettingsOverride(next);
  }

  function handleTreeViewModeChange(mode: TreeViewMode) {
    setTreeViewMode(mode);
    if (mode === "full") {
      setFocusPersonId(null);
    }
  }

  function clearFocusPerson() {
    setFocusPersonId(null);
    setTreeViewMode("full");
  }

  const filteredResults = searchPersons(persons, searchQuery);

  const handlePersonSelect = useCallback(
    (personId: string) => {
      if (view === "tree") {
        if (treeViewMode === "full") {
          // Existing behavior: pan to person
          treeRef.current?.focusOnPerson(personId);
        } else {
          // Ancestor/Descendant mode: set as focus person
          setFocusPersonId(personId);
        }
      }
    },
    [view, treeViewMode],
  );

  return (
    <div>
      {/* Toolbar: toggle + search */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
          <button
            onClick={() => setView("tree")}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              view === "tree"
                ? "bg-[#7fdb9a]/20 text-[#7fdb9a]"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            Tree View
          </button>
          <button
            onClick={() => setView("list")}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
              view === "list"
                ? "bg-[#7fdb9a]/20 text-[#7fdb9a]"
                : "text-white/40 hover:text-white/60"
            }`}
          >
            List View
          </button>
        </div>

        <div className="w-full max-w-sm sm:flex-1 sm:w-auto">
          <SearchInput
            persons={persons}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onPersonSelect={handlePersonSelect}
            showDropdown={view === "tree"}
            resultCount={
              view === "list" ? filteredResults.length : undefined
            }
            totalCount={persons.length}
          />
        </div>

        {/* Tree settings — only show in tree view */}
        {view === "tree" && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Tree view mode toggle */}
            <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
              <button
                onClick={() => handleTreeViewModeChange("full")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  treeViewMode === "full"
                    ? "bg-[#7fdb9a]/20 text-[#7fdb9a]"
                    : "text-white/40 hover:text-white/60"
                }`}
                title="Show full tree"
              >
                Full
              </button>
              <button
                onClick={() => handleTreeViewModeChange("ancestors")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  treeViewMode === "ancestors"
                    ? "bg-[#7fdb9a]/20 text-[#7fdb9a]"
                    : "text-white/40 hover:text-white/60"
                }`}
                title="Show ancestors of a person"
              >
                Ancestors
              </button>
              <button
                onClick={() => handleTreeViewModeChange("descendants")}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  treeViewMode === "descendants"
                    ? "bg-[#7fdb9a]/20 text-[#7fdb9a]"
                    : "text-white/40 hover:text-white/60"
                }`}
                title="Show descendants of a person"
              >
                Descendants
              </button>
            </div>

            {/* Orientation toggle */}
            <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
              <button
                onClick={() => updateTreeSettings({ orientation: "vertical" })}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  treeSettings.orientation === "vertical"
                    ? "bg-[#7fdb9a]/20 text-[#7fdb9a]"
                    : "text-white/40 hover:text-white/60"
                }`}
                title="Vertical layout (top-down)"
              >
                ↕ Vertical
              </button>
              <button
                onClick={() => updateTreeSettings({ orientation: "horizontal" })}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  treeSettings.orientation === "horizontal"
                    ? "bg-[#7fdb9a]/20 text-[#7fdb9a]"
                    : "text-white/40 hover:text-white/60"
                }`}
                title="Horizontal layout (left-right)"
              >
                ↔ Horizontal
              </button>
            </div>

            {/* Connection style toggle */}
            <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
              <button
                onClick={() => updateTreeSettings({ connectionStyle: "curved" })}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  treeSettings.connectionStyle === "curved"
                    ? "bg-[#7fdb9a]/20 text-[#7fdb9a]"
                    : "text-white/40 hover:text-white/60"
                }`}
                title="Curved connections"
              >
                ⌒ Curved
              </button>
              <button
                onClick={() => updateTreeSettings({ connectionStyle: "right-angle" })}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  treeSettings.connectionStyle === "right-angle"
                    ? "bg-[#7fdb9a]/20 text-[#7fdb9a]"
                    : "text-white/40 hover:text-white/60"
                }`}
                title="Right-angle connections"
              >
                ⊾ Right Angle
              </button>
            </div>

            {/* Node style toggle */}
            <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
              <button
                onClick={() => updateTreeSettings({ nodeStyle: "compact" })}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  treeSettings.nodeStyle === "compact"
                    ? "bg-[#7fdb9a]/20 text-[#7fdb9a]"
                    : "text-white/40 hover:text-white/60"
                }`}
                title="Compact nodes (name only)"
              >
                ▬ Compact
              </button>
              <button
                onClick={() => updateTreeSettings({ nodeStyle: "detailed" })}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                  treeSettings.nodeStyle === "detailed"
                    ? "bg-[#7fdb9a]/20 text-[#7fdb9a]"
                    : "text-white/40 hover:text-white/60"
                }`}
                title="Detailed nodes (name, dates, location, avatar)"
              >
                ▣ Detailed
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Focus person indicator */}
      {view === "tree" && treeViewMode !== "full" && focusPersonName && (
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-lg bg-[#7fdb9a]/10 px-3 py-1.5 text-sm text-[#7fdb9a]">
            {treeViewMode === "ancestors" ? "Ancestors" : "Descendants"} of{" "}
            <span className="font-semibold">{focusPersonName}</span>
          </span>
          <button
            onClick={clearFocusPerson}
            className="rounded-lg px-2 py-1 text-xs text-white/40 transition hover:bg-white/10 hover:text-white/60"
            title="Clear and return to full tree"
          >
            ✕
          </button>
        </div>
      )}

      {/* Views */}
      {view === "tree" ? (
        <SimpleTreeView
          ref={treeRef}
          graphId={graphId}
          persons={persons}
          relationships={relationships}
          orientation={treeSettings.orientation}
          connectionStyle={treeSettings.connectionStyle}
          nodeStyle={treeSettings.nodeStyle}
          treeViewMode={treeViewMode}
          focusPersonId={focusPersonId}
        />
      ) : (
        <div className="mx-auto max-w-5xl">
          <PersonList
            graphId={graphId}
            initialPersons={persons}
            initialRelationships={relationships}
            isAdmin={isAdmin}
            searchQuery={searchQuery}
            storyCountMap={storyCountMap}
          />
        </div>
      )}
    </div>
  );
}
