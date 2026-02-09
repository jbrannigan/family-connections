"use client";

import type { ReactNode } from "react";
import { UndoProvider } from "@/lib/undo";
import UndoToastDisplay from "@/lib/undo-toast";

interface PersonPageClientProps {
  graphId: string;
  children: ReactNode;
}

export default function PersonPageClient({
  graphId,
  children,
}: PersonPageClientProps) {
  return (
    <UndoProvider graphId={graphId}>
      {children}
      <UndoToastDisplay />
    </UndoProvider>
  );
}
