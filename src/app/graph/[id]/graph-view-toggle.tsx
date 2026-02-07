"use client";

import { useState, useRef, useCallback } from "react";
import PersonList from "./person-list";
import SimpleTreeView, { type SimpleTreeViewHandle } from "./simple-tree-view";
import SearchInput from "./search-input";
import { searchPersons } from "@/lib/search";
import type { Person, Relationship } from "@/types/database";

type ViewMode = "tree" | "list";

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
      </div>

      {/* Views */}
      {view === "tree" ? (
        <SimpleTreeView
          ref={treeRef}
          graphId={graphId}
          persons={persons}
          relationships={relationships}
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
