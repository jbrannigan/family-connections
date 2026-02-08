"use client";

import { useState, useRef, useEffect } from "react";

export default function ExportButton({ graphId }: { graphId: string }) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClick);
      return () => document.removeEventListener("mousedown", handleClick);
    }
  }, [open]);

  async function handleExport(format: "txt" | "json") {
    setExporting(format);
    setOpen(false);

    try {
      const response = await fetch(
        `/api/graph/${graphId}/export?format=${format}`,
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        alert(err.error ?? "Export failed");
        return;
      }

      // Get filename from Content-Disposition header
      const disposition = response.headers.get("Content-Disposition");
      const filenameMatch = disposition?.match(/filename="(.+)"/);
      const filename =
        filenameMatch?.[1] ?? `family-export.${format}`;

      // Trigger browser download
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Export failed. Please try again.");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={exporting !== null}
        className="rounded-xl border border-white/20 px-4 py-1.5 text-sm font-semibold transition hover:bg-white/5 disabled:opacity-50"
      >
        {exporting ? "Exporting..." : "Export ▾"}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-white/10 bg-[#1a2f25] py-1 shadow-xl">
          <button
            onClick={() => handleExport("txt")}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-white/80 transition hover:bg-white/5"
          >
            <span className="text-base">📄</span>
            <div>
              <div className="font-medium">Archive (.txt)</div>
              <div className="text-xs text-white/40">
                Human-readable plain text
              </div>
            </div>
          </button>
          <button
            onClick={() => handleExport("json")}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-white/80 transition hover:bg-white/5"
          >
            <span className="text-base">🔧</span>
            <div>
              <div className="font-medium">Data (.json)</div>
              <div className="text-xs text-white/40">
                Structured machine-readable
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
