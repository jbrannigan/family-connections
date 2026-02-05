"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Person, Relationship } from "@/types/database";
import {
  transformToDTreeData,
  formatLifespan,
  type DTreeNode,
} from "@/lib/dtree-transform";

interface DTreeViewProps {
  persons: Person[];
  relationships: Relationship[];
  onPersonClick?: (personId: string) => void;
}

// Extended window type for dTree
declare global {
  interface Window {
    dTree: {
      init: (
        data: DTreeNode[],
        options: DTreeOptions,
      ) => DTreeInstance;
    };
    _: unknown; // lodash
    d3: unknown; // d3
  }
}

interface DTreeOptions {
  target: string;
  debug?: boolean;
  width: number;
  height: number;
  hideMarriageNodes?: boolean;
  marriageNodeSize?: number;
  nodeWidth?: number;
  margin?: { top: number; right: number; bottom: number; left: number };
  styles?: {
    node?: string;
    linage?: string;
    marriage?: string;
    text?: string;
  };
  callbacks?: {
    nodeClick?: (name: string, extra: Record<string, unknown>, id: string) => void;
    nodeRenderer?: (
      name: string,
      x: number,
      y: number,
      height: number,
      width: number,
      extra: Record<string, unknown>,
      id: string,
      nodeClass: string,
      textClass: string,
      textRenderer: (
        name: string,
        extra: Record<string, unknown>,
        textClass: string,
      ) => string,
    ) => string;
    textRenderer?: (
      name: string,
      extra: Record<string, unknown>,
      textClass: string,
    ) => string;
    nodeHeightSeperation?: (nodeWidth: number, nodeMaxHeight: number) => number;
    nodeSize?: (
      nodes: unknown[],
      width: number,
      textRenderer: unknown,
    ) => [number, number];
  };
}

interface DTreeInstance {
  resetZoom: (duration?: number) => void;
  zoomTo: (x: number, y: number, zoom?: number, duration?: number) => void;
  zoomToNode: (nodeId: string, zoom?: number, duration?: number) => void;
  zoomToFit: (duration?: number) => void;
}

export default function DTreeView({
  persons,
  relationships,
  onPersonClick,
}: DTreeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const treeInstanceRef = useRef<DTreeInstance | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

  // Store callback in ref to avoid recreation
  const onPersonClickRef = useRef(onPersonClick);
  onPersonClickRef.current = onPersonClick;

  const handlePersonClick = useCallback((personId: string) => {
    const person = persons.find((p) => p.id === personId);
    if (person) {
      setSelectedPerson(person);
      onPersonClickRef.current?.(personId);
    }
  }, [persons]);

  useEffect(() => {
    let mounted = true;

    async function loadAndInit() {
      if (!containerRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        // Load dependencies via CDN (dTree requires lodash and D3 on window)
        if (!window.d3) {
          await loadScript(
            "https://cdn.jsdelivr.net/npm/d3@4.13.0/build/d3.min.js",
          );
        }
        if (!window._) {
          await loadScript(
            "https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js",
          );
        }
        if (!window.dTree) {
          await loadScript(
            "https://cdn.jsdelivr.net/npm/d3-dtree@2.4.1/dist/dTree.min.js",
          );
        }

        if (!mounted) return;

        // Clear any existing content
        const container = containerRef.current;
        container.innerHTML = "";

        // Transform data
        const treeData = transformToDTreeData(persons, relationships);

        if (treeData.length === 0) {
          setError("No family tree data to display. Add some people and relationships first.");
          setIsLoading(false);
          return;
        }

        // Get container dimensions
        const rect = container.getBoundingClientRect();
        const width = rect.width || 800;
        const height = rect.height || 600;

        // Custom node renderer for better display
        const nodeRenderer = (
          name: string,
          _x: number,
          _y: number,
          _height: number,
          _width: number,
          extra: Record<string, unknown>,
          id: string,
          nodeClass: string,
        ) => {
          const lifespan = formatLifespan(
            extra?.birthDate as string | null,
            extra?.deathDate as string | null,
          );
          const pronouns = extra?.pronouns as string | null;

          return `
            <div class="${nodeClass}" data-id="${id}" style="
              width: 100%;
              height: 100%;
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              padding: 8px;
              box-sizing: border-box;
              cursor: pointer;
              border-radius: 8px;
              background: linear-gradient(135deg, #1a2f25 0%, #0f1f18 100%);
              border: 2px solid #7fdb9a;
              color: #e0f0e6;
              font-family: system-ui, sans-serif;
              text-align: center;
              overflow: hidden;
            ">
              <div style="
                font-weight: 600;
                font-size: 13px;
                line-height: 1.2;
                margin-bottom: 2px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                max-width: 100%;
              ">${escapeHtml(name)}</div>
              ${lifespan ? `<div style="font-size: 11px; color: #a0c0b0; margin-bottom: 2px;">${escapeHtml(lifespan)}</div>` : ""}
              ${pronouns ? `<div style="font-size: 10px; color: #7fdb9a;">${escapeHtml(pronouns)}</div>` : ""}
            </div>
          `;
        };

        // Custom node size
        const nodeSize = () => [160, 70] as [number, number];

        // Custom height separation
        const nodeHeightSeperation = () => 120;

        // Initialize dTree
        const tree = window.dTree.init(treeData, {
          target: `#${container.id}`,
          debug: false,
          width,
          height,
          hideMarriageNodes: true,
          marriageNodeSize: 5,
          nodeWidth: 160,
          margin: { top: 20, right: 20, bottom: 20, left: 20 },
          styles: {
            node: "dtree-node",
            linage: "dtree-linage",
            marriage: "dtree-marriage",
            text: "dtree-text",
          },
          callbacks: {
            nodeRenderer,
            nodeSize,
            nodeHeightSeperation,
            nodeClick: (_name: string, extra: Record<string, unknown>, id: string) => {
              // dTree passes the node id, but we stored person id in the node
              // The id from dTree might be numeric, but we stored our id in extra or used it as node.id
              // Let's find it by checking the extra or the original id
              handlePersonClick(id);
            },
          },
        });

        treeInstanceRef.current = tree;

        // Add click handlers to nodes (since dTree callback might not work perfectly)
        setTimeout(() => {
          const nodeElements = container.querySelectorAll(".dtree-node");
          nodeElements.forEach((el) => {
            const id = el.getAttribute("data-id");
            if (id) {
              el.addEventListener("click", () => handlePersonClick(id));
            }
          });

          // Zoom to fit after render
          tree.zoomToFit(300);
        }, 100);

        setIsLoading(false);
      } catch (err) {
        console.error("dTree initialization error:", err);
        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to initialize family tree",
          );
          setIsLoading(false);
        }
      }
    }

    loadAndInit();

    return () => {
      mounted = false;
    };
  }, [persons, relationships, handlePersonClick]);

  return (
    <div className="relative w-full h-full min-h-[600px] bg-[#0a1410]">
      {/* Tree container */}
      <div
        ref={containerRef}
        id="dtree-container"
        className="w-full h-full"
        style={{ minHeight: "600px" }}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a1410]/80">
          <div className="text-[#7fdb9a] text-lg">Loading family tree...</div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a1410]/80">
          <div className="text-red-400 text-center p-4 max-w-md">
            <p className="text-lg font-semibold mb-2">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Zoom controls */}
      {!isLoading && !error && treeInstanceRef.current && (
        <div className="absolute bottom-4 right-4 flex gap-2">
          <button
            onClick={() => treeInstanceRef.current?.zoomToFit(300)}
            className="px-3 py-2 bg-[#1a2f25] hover:bg-[#2a4035] text-[#7fdb9a] rounded border border-[#7fdb9a]/30 text-sm"
            title="Fit to view"
          >
            Fit
          </button>
          <button
            onClick={() => treeInstanceRef.current?.resetZoom(300)}
            className="px-3 py-2 bg-[#1a2f25] hover:bg-[#2a4035] text-[#7fdb9a] rounded border border-[#7fdb9a]/30 text-sm"
            title="Reset zoom"
          >
            Reset
          </button>
        </div>
      )}

      {/* Selected person info panel */}
      {selectedPerson && (
        <div className="absolute bottom-4 left-4 right-24 max-w-md p-4 bg-[#1a2f25] rounded-lg border border-[#7fdb9a]/30">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-[#7fdb9a]">
                {selectedPerson.display_name}
              </h3>
              {selectedPerson.pronouns && (
                <p className="text-sm text-[#a0c0b0]">
                  {selectedPerson.pronouns}
                </p>
              )}
              {(selectedPerson.birth_date || selectedPerson.death_date) && (
                <p className="text-sm text-[#a0c0b0]">
                  {formatLifespan(
                    selectedPerson.birth_date,
                    selectedPerson.death_date,
                  )}
                </p>
              )}
              {selectedPerson.birth_location && (
                <p className="text-sm text-[#a0c0b0]">
                  {selectedPerson.birth_location}
                </p>
              )}
              {selectedPerson.notes && (
                <p className="text-sm text-[#e0f0e6] mt-2">
                  {selectedPerson.notes}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedPerson(null)}
              className="text-[#a0c0b0] hover:text-[#7fdb9a] text-xl leading-none"
              title="Close"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* CSS for dTree */}
      <style jsx global>{`
        #dtree-container svg {
          width: 100% !important;
          height: 100% !important;
        }

        .dtree-linage {
          fill: none;
          stroke: #7fdb9a;
          stroke-width: 1.5px;
        }

        .dtree-marriage {
          fill: none;
          stroke: #7fdb9a;
          stroke-width: 1.5px;
        }

        .dtree-node {
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .dtree-node:hover {
          transform: scale(1.02);
          box-shadow: 0 0 12px rgba(127, 219, 154, 0.4);
        }
      `}</style>
    </div>
  );
}

// Helper to load scripts dynamically
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if already loaded
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });
}

// Helper to escape HTML
function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
