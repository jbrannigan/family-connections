"use client";

import { memo } from "react";
import type { Person } from "@/types/database";

interface TreeNodeProps {
  nodeId: string;
  top: number;
  left: number;
  person: Person | null;
  isPlaceholder: boolean;
  halfWidth: number;
  halfHeight: number;
  isSelected: boolean;
  onClick: () => void;
}

export default memo(function TreeNode({
  person,
  isPlaceholder,
  top,
  left,
  halfWidth,
  halfHeight,
  isSelected,
  onClick,
}: TreeNodeProps) {
  if (isPlaceholder) return null;

  const name = person?.display_name ?? "Unknown";
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Extract years from date fields
  const birthYear = person?.birth_date?.match(/\d{4}/)?.[0];
  const deathYear = person?.death_date?.match(/\d{4}/)?.[0];
  const yearsLabel = birthYear
    ? deathYear
      ? `${birthYear}–${deathYear}`
      : birthYear
    : null;

  return (
    <div
      className={`absolute flex flex-col items-center cursor-pointer transition-transform hover:scale-110 ${
        isSelected ? "z-10" : ""
      }`}
      style={{
        width: halfWidth,
        transform: `translate(${left * halfWidth}px, ${top * halfHeight}px)`,
      }}
      onClick={onClick}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#9aebaf] to-[#4a9d6a] text-xs font-bold text-[#0f1a14] shadow-lg shadow-[#7fdb9a]/20 ${
          isSelected
            ? "ring-2 ring-[#7fdb9a] ring-offset-2 ring-offset-[#0a1410]"
            : ""
        } ${person?.is_incomplete ? "from-yellow-400 to-yellow-600" : ""}`}
      >
        {person?.is_incomplete ? "?" : initials}
      </div>

      <p className="mt-1.5 max-w-[90%] truncate text-center text-[11px] font-medium leading-tight text-white/80">
        {name}
      </p>

      {yearsLabel && (
        <p className="text-center text-[9px] text-white/40">{yearsLabel}</p>
      )}
    </div>
  );
});
