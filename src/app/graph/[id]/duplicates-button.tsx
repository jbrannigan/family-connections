"use client";

import { useState } from "react";
import DuplicatesModal from "./duplicates-modal";
import type { Person } from "@/types/database";

interface DuplicatesButtonProps {
  graphId: string;
  persons: Person[];
}

export default function DuplicatesButton({
  graphId,
  persons,
}: DuplicatesButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-xl border border-white/20 px-3 py-2.5 text-sm font-semibold transition hover:bg-white/5 sm:px-4 sm:py-1.5"
      >
        Duplicates
      </button>
      <DuplicatesModal
        graphId={graphId}
        persons={persons}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
