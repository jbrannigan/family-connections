"use client";

import { useState } from "react";

interface TOCItem {
  id: string;
  label: string;
  emoji: string;
}

export default function TableOfContents({ items }: { items: TOCItem[] }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Mobile: collapsible dropdown */}
      <nav className="mb-8 lg:hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white/70 transition hover:bg-white/10"
        >
          <span>On this page</span>
          <span className={`transition-transform ${isOpen ? "rotate-180" : ""}`}>
            ▾
          </span>
        </button>
        {isOpen && (
          <div className="mt-2 rounded-xl border border-white/10 bg-white/5 p-3">
            <ul className="space-y-1">
              {items.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={() => setIsOpen(false)}
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/50 transition hover:bg-white/5 hover:text-[#7fdb9a]"
                  >
                    <span>{item.emoji}</span>
                    <span>{item.label}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* Desktop: sticky sidebar */}
      <nav className="hidden lg:block">
        <div className="sticky top-8">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-white/30">
            On this page
          </p>
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-white/50 transition hover:bg-white/5 hover:text-[#7fdb9a]"
                >
                  <span className="text-xs">{item.emoji}</span>
                  <span>{item.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </>
  );
}
