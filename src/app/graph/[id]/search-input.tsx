"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { searchPersons } from "@/lib/search";
import type { Person } from "@/types/database";

interface SearchInputProps {
  persons: Person[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onPersonSelect: (personId: string) => void;
  showDropdown: boolean;
  resultCount?: number;
  totalCount?: number;
}

function HighlightedText({
  text,
  ranges,
}: {
  text: string;
  ranges: Array<{ start: number; end: number }>;
}) {
  if (ranges.length === 0) return <>{text}</>;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const range of ranges) {
    if (range.start > lastIndex) {
      parts.push(text.slice(lastIndex, range.start));
    }
    parts.push(
      <span key={range.start} className="bg-[#7fdb9a]/30 text-[#7fdb9a]">
        {text.slice(range.start, range.end)}
      </span>,
    );
    lastIndex = range.end;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}

export { HighlightedText };

export default function SearchInput({
  persons,
  searchQuery,
  onSearchChange,
  onPersonSelect,
  showDropdown,
  resultCount,
  totalCount,
}: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDropdownVisible, setIsDropdownVisible] = useState(false);

  // Derive search results from props (no effect needed)
  const results = useMemo(
    () =>
      searchQuery.trim() && showDropdown
        ? searchPersons(persons, searchQuery)
        : [],
    [searchQuery, persons, showDropdown],
  );

  const isDropdownOpen = isDropdownVisible && results.length > 0;

  // Cmd+K / Ctrl+K keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
        onSearchChange("");
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onSearchChange]);

  const handleBlur = useCallback(() => {
    // Delay to allow click on dropdown item to register
    setTimeout(() => setIsDropdownVisible(false), 200);
  }, []);

  const handleSelect = useCallback(
    (personId: string) => {
      onPersonSelect(personId);
      setIsDropdownVisible(false);
      onSearchChange("");
    },
    [onPersonSelect, onSearchChange],
  );

  return (
    <div className="relative">
      <div className="relative">
        {/* Magnifying glass icon */}
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value);
            setIsDropdownVisible(true);
          }}
          onFocus={() => {
            if (searchQuery.trim() && showDropdown) {
              setIsDropdownVisible(true);
            }
          }}
          onBlur={handleBlur}
          placeholder="Search people... (⌘K)"
          className="w-full rounded-xl border border-white/20 bg-white/5 py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
        />

        {/* Clear button */}
        {searchQuery && (
          <button
            onClick={() => onSearchChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Result count badge (list view) */}
      {!showDropdown && resultCount !== undefined && totalCount !== undefined && searchQuery.trim() && (
        <div className="mt-1.5 text-xs text-white/40">
          {resultCount} of {totalCount} persons
        </div>
      )}

      {/* Dropdown (tree view) */}
      {showDropdown && isDropdownOpen && results.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#0f1a14] shadow-lg">
          {results.slice(0, 20).map((result) => (
            <button
              key={result.person.id}
              onMouseDown={() => handleSelect(result.person.id)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/5 transition"
            >
              <span className="flex-1">
                <HighlightedText
                  text={result.person.display_name}
                  ranges={result.matchRanges}
                />
              </span>
              {result.person.birth_date && (
                <span className="text-xs text-white/30">
                  b. {result.person.birth_date}
                </span>
              )}
            </button>
          ))}
          {results.length > 20 && (
            <div className="px-4 py-2 text-xs text-white/30">
              +{results.length - 20} more results
            </div>
          )}
        </div>
      )}
    </div>
  );
}
