"use client";

import { useState, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { findDuplicates, type DuplicatePair } from "@/lib/duplicate-detection";
import { mergePersons } from "./merge-actions";
import type { Person } from "@/types/database";

interface DuplicatesModalProps {
  graphId: string;
  persons: Person[];
  isOpen: boolean;
  onClose: () => void;
}

/** Format a date value for display, falling back to "—" if empty. */
function displayValue(value: string | null | boolean): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value || "—";
}

/** Fields to compare side-by-side. */
const COMPARE_FIELDS: { key: keyof Person; label: string }[] = [
  { key: "display_name", label: "Display Name" },
  { key: "given_name", label: "Given Name" },
  { key: "nickname", label: "Nickname" },
  { key: "preferred_name", label: "Preferred Name" },
  { key: "pronouns", label: "Pronouns" },
  { key: "birth_date", label: "Birth Date" },
  { key: "death_date", label: "Death Date" },
  { key: "birth_location", label: "Birth Location" },
  { key: "is_incomplete", label: "Incomplete" },
  { key: "notes", label: "Notes" },
];

export default function DuplicatesModal({
  graphId,
  persons,
  isOpen,
  onClose,
}: DuplicatesModalProps) {
  const router = useRouter();
  const backdropRef = useRef<HTMLDivElement>(null);

  // Compute duplicates on first render when modal opens
  const duplicates = useMemo(() => {
    if (!isOpen) return [];
    return findDuplicates(persons);
  }, [isOpen, persons]);

  const [selectedPair, setSelectedPair] = useState<DuplicatePair | null>(null);
  const [merging, setMerging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [dismissedPairs, setDismissedPairs] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const activeDuplicates = duplicates.filter(
    (d) =>
      !dismissedPairs.has(`${d.personA.id}:${d.personB.id}`),
  );

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) {
      handleClose();
    }
  }

  function handleClose() {
    setSelectedPair(null);
    setError(null);
    setSuccessMessage(null);
    setDismissedPairs(new Set());
    onClose();
  }

  function handleDismiss(pair: DuplicatePair) {
    setDismissedPairs(
      (prev) => new Set([...prev, `${pair.personA.id}:${pair.personB.id}`]),
    );
  }

  async function handleMerge(keepId: string, removeId: string) {
    setMerging(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await mergePersons(graphId, keepId, removeId);

      if (!result.success) {
        setError(result.error);
        return;
      }

      const warningText =
        result.warnings.length > 0
          ? ` (${result.warnings.length} adjustment${result.warnings.length === 1 ? "" : "s"} made)`
          : "";
      setSuccessMessage(`Merged successfully${warningText}`);
      setSelectedPair(null);

      // Refresh the page data
      router.refresh();

      // Auto-dismiss success after 3s
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Merge failed");
    } finally {
      setMerging(false);
    }
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="relative max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1a14] p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {selectedPair ? "Compare & Merge" : "Potential Duplicates"}
          </h2>
          <button
            onClick={handleClose}
            className="text-white/40 transition hover:text-white/80"
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}
        {successMessage && (
          <div className="mb-4 rounded-lg border border-[#7fdb9a]/30 bg-[#7fdb9a]/10 px-4 py-3 text-sm text-[#7fdb9a]">
            {successMessage}
          </div>
        )}

        {selectedPair ? (
          /* Side-by-side comparison view */
          <ComparisonView
            pair={selectedPair}
            merging={merging}
            onMerge={handleMerge}
            onDismiss={(pair) => {
              handleDismiss(pair);
              setSelectedPair(null);
              setError(null);
            }}
            onBack={() => {
              setSelectedPair(null);
              setError(null);
            }}
          />
        ) : (
          /* Results list view */
          <ResultsListView
            duplicates={activeDuplicates}
            onReview={setSelectedPair}
            onDismiss={handleDismiss}
          />
        )}
      </div>
    </div>
  );
}

/* --- Sub-components --- */

function ResultsListView({
  duplicates,
  onReview,
  onDismiss,
}: {
  duplicates: DuplicatePair[];
  onReview: (pair: DuplicatePair) => void;
  onDismiss: (pair: DuplicatePair) => void;
}) {
  if (duplicates.length === 0) {
    return (
      <div className="py-12 text-center text-white/50">
        <p className="mb-2 text-lg">No potential duplicates found</p>
        <p className="text-sm">
          All persons in this graph appear to be unique.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="mb-2 text-sm text-white/50">
        Found {duplicates.length} potential duplicate
        {duplicates.length === 1 ? "" : "s"}
      </p>

      {duplicates.map((pair) => (
        <div
          key={`${pair.personA.id}:${pair.personB.id}`}
          className="rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {pair.personA.display_name}
                </span>
                <span className="text-white/30">&amp;</span>
                <span className="font-semibold">
                  {pair.personB.display_name}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-[#7fdb9a]/20 px-2 py-0.5 text-xs font-semibold text-[#7fdb9a]">
                  {Math.min(pair.score, 100)}% match
                </span>
                {pair.reasons.map((reason) => (
                  <span
                    key={reason}
                    className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60"
                  >
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onReview(pair)}
              className="rounded-lg bg-[#7fdb9a]/20 px-3 py-1.5 text-sm font-semibold text-[#7fdb9a] transition hover:bg-[#7fdb9a]/30"
            >
              Review
            </button>
            <button
              onClick={() => onDismiss(pair)}
              className="rounded-lg bg-white/5 px-3 py-1.5 text-sm text-white/50 transition hover:bg-white/10 hover:text-white/70"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ComparisonView({
  pair,
  merging,
  onMerge,
  onDismiss,
  onBack,
}: {
  pair: DuplicatePair;
  merging: boolean;
  onMerge: (keepId: string, removeId: string) => void;
  onDismiss: (pair: DuplicatePair) => void;
  onBack: () => void;
}) {
  const { personA, personB } = pair;

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 text-sm text-white/40 transition hover:text-white/60"
      >
        ← Back to list
      </button>

      {/* Score badge */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-[#7fdb9a]/20 px-2.5 py-1 text-sm font-semibold text-[#7fdb9a]">
          {Math.min(pair.score, 100)}% match
        </span>
        {pair.reasons.map((reason) => (
          <span
            key={reason}
            className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60"
          >
            {reason}
          </span>
        ))}
      </div>

      {/* Comparison table */}
      <div className="mb-6 overflow-hidden rounded-xl border border-white/10">
        {/* Column headers */}
        <div className="grid grid-cols-[120px_1fr_1fr] border-b border-white/10 bg-white/5">
          <div className="px-3 py-2 text-xs font-semibold text-white/50">
            Field
          </div>
          <div className="border-l border-white/10 px-3 py-2 text-xs font-semibold text-[#7fdb9a]">
            Person A
          </div>
          <div className="border-l border-white/10 px-3 py-2 text-xs font-semibold text-[#7fdb9a]">
            Person B
          </div>
        </div>

        {/* Field rows */}
        {COMPARE_FIELDS.map(({ key, label }) => {
          const valA = personA[key];
          const valB = personB[key];
          const differs =
            displayValue(valA as string | null | boolean) !==
            displayValue(valB as string | null | boolean);

          return (
            <div
              key={key}
              className={`grid grid-cols-[120px_1fr_1fr] border-b border-white/5 ${
                differs ? "bg-amber-500/5" : ""
              }`}
            >
              <div className="px-3 py-2 text-xs text-white/40">{label}</div>
              <div className="break-words border-l border-white/5 px-3 py-2 text-sm">
                {displayValue(valA as string | null | boolean)}
              </div>
              <div className="break-words border-l border-white/5 px-3 py-2 text-sm">
                {displayValue(valB as string | null | boolean)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Action buttons */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => onMerge(personA.id, personB.id)}
            disabled={merging}
            className="flex-1 rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-4 py-2.5 text-sm font-semibold text-[#0f1a14] transition hover:opacity-90 disabled:opacity-50"
          >
            {merging ? "Merging…" : `Keep "${personA.display_name}"`}
          </button>
          <button
            onClick={() => onMerge(personB.id, personA.id)}
            disabled={merging}
            className="flex-1 rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-4 py-2.5 text-sm font-semibold text-[#0f1a14] transition hover:opacity-90 disabled:opacity-50"
          >
            {merging ? "Merging…" : `Keep "${personB.display_name}"`}
          </button>
        </div>
        <button
          onClick={() => onDismiss(pair)}
          disabled={merging}
          className="w-full rounded-xl border border-white/20 px-4 py-2.5 text-sm font-semibold text-white/60 transition hover:bg-white/5 hover:text-white/80 disabled:opacity-50"
        >
          Not Duplicates
        </button>
      </div>
    </div>
  );
}
