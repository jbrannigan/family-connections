"use client";

import { useState, useRef, useCallback } from "react";
import PersonList from "./person-list";
import SimpleTreeView, {
  type SimpleTreeViewHandle,
  type TreeOrientation,
  type ConnectionStyle,
} from "./simple-tree-view";
import SearchInput from "./search-input";
import { searchPersons } from "@/lib/search";
import type { Person, Relationship } from "@/types/database";

type ViewMode = "tree" | "list";

interface TreeSettings {
  orientation: TreeOrientation;
  connectionStyle: ConnectionStyle;
}

const TREE_SETTINGS_KEY = "family-connections-tree-settings";

function loadTreeSettings(): TreeSettings {
  if (typeof window === "undefined") {
    return { orientation: "vertical", connectionStyle: "curved" };
  }
  try {
    const stored = localStorage.getItem(TREE_SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        orientation: parsed.orientation === "horizontal" ? "horizontal" : "vertical",
        connectionStyle: parsed.connectionStyle === "right-angle" ? "right-angle" : "curved",
      };
    }
  } catch {
    // ignore parse errors
  }
  return { orientation: "vertical", connectionStyle: "curved" };
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

  // Tree settings with localStorage persistence (lazy init from localStorage)
  const [treeSettings, setTreeSettings] = useState<TreeSettings>(loadTreeSettings);

  function updateTreeSettings(update: Partial<TreeSettings>) {
    setTreeSettings((prev) => {
      const next = { ...prev, ...update };
      saveTreeSettings(next);
      return next;
    });
  }

  const filteredResults = searchPersons(persons, searchQuery);

  const handlePersonSelect = useCallback(
    (personId: string) => {
      if (view === "tree") {
        treeRef.current?.focusOnPerson(personId);
      }
    },
    [view],
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
          <div className="flex items-center gap-2">
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
          </div>
        )}
      </div>

      {/* Views */}
      {view === "tree" ? (
        <SimpleTreeView
          ref={treeRef}
          graphId={graphId}
          persons={persons}
          relationships={relationships}
          orientation={treeSettings.orientation}
          connectionStyle={treeSettings.connectionStyle}
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
