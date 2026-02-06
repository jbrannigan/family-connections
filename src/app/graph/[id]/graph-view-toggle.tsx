"use client";

import { useState } from "react";
import PersonList from "./person-list";
import SimpleTreeView from "./simple-tree-view";
import type { Person, Relationship } from "@/types/database";

type ViewMode = "tree" | "list";

interface GraphViewToggleProps {
  graphId: string;
  persons: Person[];
  relationships: Relationship[];
  isAdmin: boolean;
}

export default function GraphViewToggle({
  graphId,
  persons,
  relationships,
  isAdmin,
}: GraphViewToggleProps) {
  const [view, setView] = useState<ViewMode>("tree");

  return (
    <div>
      {/* Toggle */}
      <div className="mb-6 flex items-center gap-1 rounded-xl bg-white/5 p-1 w-fit">
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

      {/* Views */}
      {view === "tree" ? (
        <SimpleTreeView
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
          />
        </div>
      )}
    </div>
  );
}
