"use client";

import React, { useEffect, useRef, useState, useImperativeHandle } from "react";
import { useRouter } from "next/navigation";
import type { Person, Relationship } from "@/types/database";
import {
  transformToHierarchicalTree,
  transformToAncestorTree,
  transformToDescendantTree,
  type TreeDisplayNode,
} from "@/lib/dtree-transform";
import { getUnionTypeLabel } from "@/lib/union-utils";

export type TreeOrientation = "vertical" | "horizontal";
export type ConnectionStyle = "curved" | "right-angle";
export type NodeStyle = "compact" | "detailed";

export type TreeViewMode = "full" | "ancestors" | "descendants";

interface SimpleTreeViewProps {
  graphId: string;
  persons: Person[];
  relationships: Relationship[];
  orientation?: TreeOrientation;
  connectionStyle?: ConnectionStyle;
  nodeStyle?: NodeStyle;
  treeViewMode?: TreeViewMode;
  focusPersonId?: string | null;
}

export interface SimpleTreeViewHandle {
  focusOnPerson: (personId: string) => void;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

interface D3ZoomEvent {
  transform: { k: number; x: number; y: number };
}

// Node dimensions by style
const COMPACT = { width: 280, height: 50, hSpacing: 40, vSpacing: 80 };
const DETAILED = { width: 280, height: 120, hSpacing: 50, vSpacing: 100 };

/** Get a short display year from a date string like "1958", "1958-03", "1958-03-15" */
function yearFromDate(d: string | null): string | null {
  if (!d) return null;
  const m = d.match(/^(\d{4})/);
  return m ? m[1] : null;
}

/** Build a lifespan string like "1870–1909" or "b. 1958" */
function lifespan(birth: string | null, death: string | null): string | null {
  const b = yearFromDate(birth);
  const d = yearFromDate(death);
  if (b && d) return `${b}–${d}`;
  if (b) return `b. ${b}`;
  if (d) return `d. ${d}`;
  return null;
}

/** Choose an avatar silhouette path based on pronouns */
function avatarSilhouette(pronouns: string | null): {
  path: string;
  label: string;
} {
  const p = (pronouns ?? "").toLowerCase();
  if (p.includes("she") || p.includes("her")) {
    // Female silhouette — head + shoulders with hair
    return {
      path: "M16,8 a6,6 0 1,0 0.01,0 M8,28 Q8,18 16,17 Q24,18 24,28 Z M10,6 Q10,1 16,1 Q22,1 22,6",
      label: "she/her",
    };
  }
  if (p.includes("he") || p.includes("him")) {
    // Male silhouette — head + broad shoulders
    return {
      path: "M16,9 a5.5,5.5 0 1,0 0.01,0 M6,28 Q6,18 16,17 Q26,18 26,28 Z",
      label: "he/him",
    };
  }
  // Neutral silhouette — head + moderate shoulders
  return {
    path: "M16,9 a5,5 0 1,0 0.01,0 M8,28 Q8,19 16,18 Q24,19 24,28 Z",
    label: "they/them",
  };
}

const SimpleTreeView = React.forwardRef<
  SimpleTreeViewHandle,
  SimpleTreeViewProps
>(function SimpleTreeView(
  {
    graphId,
    persons,
    relationships,
    orientation = "vertical",
    connectionStyle = "curved",
    nodeStyle = "compact",
    treeViewMode = "full",
    focusPersonId = null,
  },
  ref,
) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodeCount, setNodeCount] = useState(0);

  // Refs for programmatic zoom control
  const zoomRef = useRef<any>(null);
  const svgSelectionRef = useRef<any>(null);
  const nodePositionsRef = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );

  // Expose focusOnPerson method via ref
  useImperativeHandle(
    ref,
    () => ({
      focusOnPerson(personId: string) {
        const pos = nodePositionsRef.current.get(personId);
        if (!pos || !zoomRef.current || !svgSelectionRef.current) return;

        const d3 = (window as any).d3;
        if (!d3) return;

        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;

        const svgWidth = rect.width || 800;
        const svgHeight = rect.height || 600;

        const targetScale = 1.2;
        let targetX: number;
        let targetY: number;

        if (orientation === "vertical") {
          targetX = svgWidth / 2 - pos.x * targetScale;
          targetY = svgHeight / 2 - pos.y * targetScale;
        } else {
          targetX = svgWidth / 2 - pos.y * targetScale;
          targetY = svgHeight / 2 - pos.x * targetScale;
        }

        const transform = d3.zoomIdentity
          .translate(targetX, targetY)
          .scale(targetScale);

        svgSelectionRef.current
          .transition()
          .duration(750)
          .call(zoomRef.current.transform, transform);

        // Highlight the target node briefly
        svgSelectionRef.current
          .select("g")
          .selectAll(".node")
          .filter((d: any) => d.data.personIds?.includes(personId))
          .select("rect")
          .transition()
          .duration(200)
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 3)
          .transition()
          .delay(2000)
          .duration(500)
          .attr("stroke", "#7fdb9a")
          .attr("stroke-width", 1.5);
      },
    }),
    [orientation],
  );

  useEffect(() => {
    let mounted = true;

    async function loadAndRender() {
      if (!containerRef.current) return;

      try {
        setIsLoading(true);
        setError(null);

        // Load D3 if not already loaded
        if (!(window as any).d3) {
          await loadScript(
            "https://cdn.jsdelivr.net/npm/d3@7.8.5/dist/d3.min.js",
          );
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        const d3 = (window as any).d3;
        if (!d3 || !d3.hierarchy) {
          throw new Error(
            "D3 library failed to load properly. Please refresh the page.",
          );
        }

        if (!mounted) return;

        // Build person lookup map
        const personMap = new Map<string, Person>();
        for (const p of persons) {
          personMap.set(p.id, p);
        }

        // Transform data to hierarchical format based on view mode
        let treeData: TreeDisplayNode[];
        if (treeViewMode === "ancestors" && focusPersonId) {
          treeData = transformToAncestorTree(persons, relationships, focusPersonId);
        } else if (treeViewMode === "descendants" && focusPersonId) {
          treeData = transformToDescendantTree(persons, relationships, focusPersonId);
        } else {
          treeData = transformToHierarchicalTree(persons, relationships);
        }

        if (treeData.length === 0) {
          setError("No family tree data to display.");
          setIsLoading(false);
          return;
        }

        const rootData = treeData[0];

        // Count nodes
        function countNodes(node: TreeDisplayNode): number {
          let count = 1;
          for (const child of node.children) {
            count += countNodes(child);
          }
          return count;
        }
        setNodeCount(countNodes(rootData));

        // Clear container
        const container = containerRef.current;
        container.innerHTML = "";

        // Select dimensions based on node style
        const dim = nodeStyle === "detailed" ? DETAILED : COMPACT;

        // Create hierarchy
        const root = d3.hierarchy(rootData);
        const descendants = root.descendants();

        // Create tree layout
        const treeLayout = d3
          .tree()
          .nodeSize(
            orientation === "vertical"
              ? [dim.width + dim.hSpacing, dim.height + dim.vSpacing]
              : [dim.height + dim.vSpacing, dim.width + dim.hSpacing],
          )
          .separation(() => 1.2);

        treeLayout(root);

        // Build person-to-position lookup for focusOnPerson
        const posMap = new Map<string, { x: number; y: number }>();
        for (const d of descendants) {
          const node = d as { x: number; y: number; data: TreeDisplayNode };
          for (const pid of node.data.personIds) {
            posMap.set(pid, { x: node.x, y: node.y });
          }
        }
        nodePositionsRef.current = posMap;

        // Get container dimensions
        const rect = container.getBoundingClientRect();
        const svgWidth = rect.width || 800;
        const svgHeight = rect.height || 600;

        // Create SVG
        const svg = d3
          .select(container)
          .append("svg")
          .attr("width", "100%")
          .attr("height", "100%")
          .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
          .style("background", "#0a1410");

        svgSelectionRef.current = svg;

        // Create zoom behavior
        const zoom = d3
          .zoom()
          .scaleExtent([0.1, 3])
          .on("zoom", (event: D3ZoomEvent) => {
            g.attr(
              "transform",
              `translate(${event.transform.x},${event.transform.y}) scale(${event.transform.k})`,
            );
          });

        zoomRef.current = zoom;
        svg.call(zoom as unknown);

        // Create main group
        const g = svg.append("g");

        // Initial transform
        if (orientation === "vertical") {
          svg.call(
            zoom.transform as unknown,
            d3.zoomIdentity
              .translate(svgWidth / 2, 80)
              .scale(0.8),
          );
        } else {
          svg.call(
            zoom.transform as unknown,
            d3.zoomIdentity
              .translate(svgWidth / 4, svgHeight / 2)
              .scale(0.8),
          );
        }

        // ── Draw links ──────────────────────────────────────
        if (connectionStyle === "right-angle") {
          g.selectAll(".link")
            .data(root.links())
            .enter()
            .append("path")
            .attr("class", "link")
            .attr("d", (d: any) => {
              if (orientation === "vertical") {
                const midY = (d.source.y + d.target.y) / 2;
                return `M${d.source.x},${d.source.y} L${d.source.x},${midY} L${d.target.x},${midY} L${d.target.x},${d.target.y}`;
              } else {
                const midX = (d.source.y + d.target.y) / 2;
                return `M${d.source.y},${d.source.x} L${midX},${d.source.x} L${midX},${d.target.x} L${d.target.y},${d.target.x}`;
              }
            })
            .attr("fill", "none")
            .attr("stroke", "#7fdb9a")
            .attr("stroke-width", "1.5");
        } else {
          if (orientation === "vertical") {
            const linkGen = d3
              .linkVertical()
              .x((d: unknown) => (d as { x: number }).x)
              .y((d: unknown) => (d as { y: number }).y);
            g.selectAll(".link")
              .data(root.links())
              .enter()
              .append("path")
              .attr("class", "link")
              .attr("d", linkGen as unknown as string)
              .attr("fill", "none")
              .attr("stroke", "#7fdb9a")
              .attr("stroke-width", "1.5");
          } else {
            const linkGen = d3
              .linkHorizontal()
              .x((d: unknown) => (d as { y: number }).y)
              .y((d: unknown) => (d as { x: number }).x);
            g.selectAll(".link")
              .data(root.links())
              .enter()
              .append("path")
              .attr("class", "link")
              .attr("d", linkGen as unknown as string)
              .attr("fill", "none")
              .attr("stroke", "#7fdb9a")
              .attr("stroke-width", "1.5");
          }
        }

        // ── Draw nodes ──────────────────────────────────────
        const nodes = g
          .selectAll(".node")
          .data(descendants)
          .enter()
          .append("g")
          .attr("class", "node")
          .attr("transform", (d: unknown) => {
            const node = d as { x: number; y: number };
            return orientation === "vertical"
              ? `translate(${node.x},${node.y})`
              : `translate(${node.y},${node.x})`;
          });

        // Node background rectangles
        nodes
          .append("rect")
          .attr("x", -dim.width / 2)
          .attr("y", -dim.height / 2)
          .attr("width", dim.width)
          .attr("height", dim.height)
          .attr("rx", 6)
          .attr("fill", "#1a2f25")
          .attr("stroke", "#7fdb9a")
          .attr("stroke-width", 1.5)
          .style("cursor", "pointer");

        if (nodeStyle === "detailed") {
          // ── Detailed node rendering ──────────────────────
          renderDetailedNodes(nodes, personMap, dim);
        } else {
          // ── Compact node rendering (original) ────────────
          nodes
            .append("text")
            .attr("text-anchor", "middle")
            .attr("dy", (d: unknown) => {
              const node = d as { data: TreeDisplayNode };
              return node.data.unionType ? "-0.1em" : "0.35em";
            })
            .attr("fill", "#e0f0e6")
            .attr("font-size", "11px")
            .attr("font-family", "system-ui, sans-serif")
            .text((d: unknown) => {
              const node = d as { data: TreeDisplayNode };
              const name = node.data.name;
              return name.length > 45
                ? name.substring(0, 42) + "..."
                : name;
            })
            .style("cursor", "pointer");

          // Compact union type indicator
          nodes.each(function (this: any, d: any) {
            const node = d as { data: TreeDisplayNode };
            if (!node.data.unionType) return;
            const gNode = (window as any).d3.select(this);
            const unionLabel = getUnionTypeLabel(node.data.unionType);
            const indicatorColor =
              node.data.unionType === "ex_spouse"
                ? "#f87171"
                : node.data.unionType === "partner"
                  ? "#60a5fa"
                  : "#7fdb9a";
            gNode
              .append("text")
              .attr("text-anchor", "middle")
              .attr("dy", "1.4em")
              .attr("fill", indicatorColor)
              .attr("fill-opacity", 0.6)
              .attr("font-size", "8px")
              .attr("font-family", "system-ui, sans-serif")
              .text(unionLabel)
              .style("cursor", "pointer");
          });
        }

        // Add hover effects
        nodes.on("mouseover", function (this: any) {
          d3.select(this)
            .select("rect")
            .attr("stroke-width", 2.5)
            .attr("stroke", "#a0f0b0");
        });

        nodes.on("mouseout", function (this: any) {
          d3.select(this)
            .select("rect")
            .attr("stroke-width", 1.5)
            .attr("stroke", "#7fdb9a");
        });

        // Click to navigate
        nodes.on("click", (_event: unknown, d: unknown) => {
          const node = d as { data: TreeDisplayNode };
          if (node.data.personIds && node.data.personIds.length > 0) {
            router.push(
              `/graph/${graphId}/person/${node.data.personIds[0]}`,
            );
          }
        });

        setIsLoading(false);
      } catch (err) {
        console.error("Tree render error:", err);
        if (mounted) {
          setError(
            err instanceof Error ? err.message : "Failed to render tree",
          );
          setIsLoading(false);
        }
      }
    }

    loadAndRender();

    return () => {
      mounted = false;
    };
  }, [
    persons,
    relationships,
    graphId,
    router,
    orientation,
    connectionStyle,
    nodeStyle,
    treeViewMode,
    focusPersonId,
  ]);

  return (
    <div className="relative w-full h-full min-h-[600px] bg-[#0a1410]">
      {!isLoading && !error && (
        <div className="absolute top-4 left-4 px-3 py-1 bg-[#1a2f25] rounded text-sm text-[#a0c0b0] border border-[#7fdb9a]/20">
          {nodeCount} family units • Scroll to zoom, drag to pan
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: "600px" }}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a1410]/80">
          <div className="text-[#7fdb9a] text-lg">
            Loading family tree...
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a1410]/80">
          <div className="text-red-400 text-center p-4 max-w-md">
            <p className="text-lg font-semibold mb-2">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {!isLoading && !error && treeViewMode !== "full" && !focusPersonId && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0a1410]/80">
          <div className="text-center p-6 max-w-md">
            <p className="text-2xl mb-3">
              {treeViewMode === "ancestors" ? "⬆" : "⬇"}
            </p>
            <p className="text-[#7fdb9a] text-lg font-semibold mb-2">
              {treeViewMode === "ancestors"
                ? "Ancestor View"
                : "Descendant View"}
            </p>
            <p className="text-white/50 text-sm">
              Search for a person above to view their{" "}
              {treeViewMode === "ancestors" ? "ancestors" : "descendants"}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
});

export default SimpleTreeView;

// ── Detailed node renderer ──────────────────────────────

function renderDetailedNodes(
  nodes: any,
  personMap: Map<string, Person>,
  dim: { width: number; height: number },
) {
  nodes.each(function (this: any, d: any) {
    const g = (window as any).d3.select(this);
    const treeNode = d.data as TreeDisplayNode;
    const pIds = treeNode.personIds;

    if (pIds.length === 1) {
      // Single person node
      const person = personMap.get(pIds[0]);
      if (person) {
        renderSinglePerson(g, person, dim);
      } else {
        renderFallbackText(g, treeNode.name);
      }
    } else if (pIds.length === 2) {
      // Couple node — split left/right
      const p1 = personMap.get(pIds[0]);
      const p2 = personMap.get(pIds[1]);

      // Divider line
      g.append("line")
        .attr("x1", 0)
        .attr("y1", -dim.height / 2 + 4)
        .attr("x2", 0)
        .attr("y2", dim.height / 2 - 4)
        .attr("stroke", "#7fdb9a")
        .attr("stroke-width", 0.5)
        .attr("stroke-opacity", 0.4);

      // Union type indicator on divider
      if (treeNode.unionType) {
        const unionLabel = getUnionTypeLabel(treeNode.unionType);
        const indicatorColor =
          treeNode.unionType === "ex_spouse"
            ? "#f87171"
            : treeNode.unionType === "partner"
              ? "#60a5fa"
              : "#7fdb9a";

        // Small pill background
        g.append("rect")
          .attr("x", -22)
          .attr("y", dim.height / 2 - 16)
          .attr("width", 44)
          .attr("height", 12)
          .attr("rx", 6)
          .attr("fill", indicatorColor)
          .attr("fill-opacity", 0.15);

        g.append("text")
          .attr("x", 0)
          .attr("y", dim.height / 2 - 7)
          .attr("text-anchor", "middle")
          .attr("fill", indicatorColor)
          .attr("font-size", "7px")
          .attr("font-weight", "600")
          .attr("font-family", "system-ui, sans-serif")
          .text(unionLabel);
      }

      if (p1) {
        renderHalfPerson(g, p1, dim, "left");
      }
      if (p2) {
        renderHalfPerson(g, p2, dim, "right");
      }
    } else {
      renderFallbackText(g, treeNode.name);
    }
  });
}

function renderSinglePerson(
  g: any,
  person: Person,
  dim: { width: number; height: number },
) {
  const startX = -dim.width / 2 + 12;
  const avatarX = startX;
  const textX = startX + 38;
  const maxTextW = dim.width - 62;

  // Avatar silhouette
  const avatar = avatarSilhouette(person.pronouns);
  g.append("path")
    .attr("d", avatar.path)
    .attr(
      "transform",
      `translate(${avatarX},${-dim.height / 2 + 10}) scale(1.1)`,
    )
    .attr("fill", "#7fdb9a")
    .attr("fill-opacity", 0.35);

  // Primary name (preferred_name or given_name or display_name)
  const primaryName =
    person.preferred_name || person.given_name || person.display_name;
  g.append("text")
    .attr("x", textX)
    .attr("y", -dim.height / 2 + 24)
    .attr("fill", "#e0f0e6")
    .attr("font-size", "13px")
    .attr("font-weight", "600")
    .attr("font-family", "system-ui, sans-serif")
    .text(truncate(primaryName, maxTextW, 13))
    .style("cursor", "pointer");

  // Nickname (if different from primary)
  const nick = person.nickname;
  if (nick && nick !== primaryName) {
    g.append("text")
      .attr("x", textX)
      .attr("y", -dim.height / 2 + 40)
      .attr("fill", "#7fdb9a")
      .attr("fill-opacity", 0.6)
      .attr("font-size", "10px")
      .attr("font-style", "italic")
      .attr("font-family", "system-ui, sans-serif")
      .text(`"${nick}"`)
      .style("cursor", "pointer");
  }

  // Surname from display_name (last word)
  const displayParts = person.display_name.trim().split(/\s+/);
  const surname =
    displayParts.length > 1 ? displayParts[displayParts.length - 1] : null;
  if (surname && surname !== primaryName) {
    g.append("text")
      .attr("x", textX)
      .attr("y", -dim.height / 2 + (nick ? 54 : 40))
      .attr("fill", "#a0c0b0")
      .attr("font-size", "10px")
      .attr("font-family", "system-ui, sans-serif")
      .text(surname)
      .style("cursor", "pointer");
  }

  // Lifespan
  const life = lifespan(person.birth_date, person.death_date);
  if (life) {
    g.append("text")
      .attr("x", textX)
      .attr("y", dim.height / 2 - 24)
      .attr("fill", "#a0c0b0")
      .attr("fill-opacity", 0.7)
      .attr("font-size", "10px")
      .attr("font-family", "system-ui, sans-serif")
      .text(life)
      .style("cursor", "pointer");
  }

  // Birth location
  if (person.birth_location) {
    g.append("text")
      .attr("x", textX)
      .attr("y", dim.height / 2 - 10)
      .attr("fill", "#a0c0b0")
      .attr("fill-opacity", 0.5)
      .attr("font-size", "9px")
      .attr("font-family", "system-ui, sans-serif")
      .text(truncate(person.birth_location, maxTextW, 9))
      .style("cursor", "pointer");
  }
}

function renderHalfPerson(
  g: any,
  person: Person,
  dim: { width: number; height: number },
  side: "left" | "right",
) {
  const halfW = dim.width / 2;
  const baseX = side === "left" ? -halfW + 8 : 8;
  const avatarX = baseX;
  const textX = baseX + 30;
  const maxTextW = halfW - 46;

  // Small avatar silhouette
  const avatar = avatarSilhouette(person.pronouns);
  g.append("path")
    .attr("d", avatar.path)
    .attr(
      "transform",
      `translate(${avatarX},${-dim.height / 2 + 12}) scale(0.85)`,
    )
    .attr("fill", "#7fdb9a")
    .attr("fill-opacity", 0.3);

  // Name
  const primaryName =
    person.preferred_name || person.given_name || person.display_name;
  g.append("text")
    .attr("x", textX)
    .attr("y", -dim.height / 2 + 26)
    .attr("fill", "#e0f0e6")
    .attr("font-size", "11px")
    .attr("font-weight", "600")
    .attr("font-family", "system-ui, sans-serif")
    .text(truncate(primaryName, maxTextW, 11))
    .style("cursor", "pointer");

  // Surname
  const displayParts = person.display_name.trim().split(/\s+/);
  const surname =
    displayParts.length > 1 ? displayParts[displayParts.length - 1] : null;
  if (surname && surname !== primaryName) {
    g.append("text")
      .attr("x", textX)
      .attr("y", -dim.height / 2 + 40)
      .attr("fill", "#a0c0b0")
      .attr("font-size", "9px")
      .attr("font-family", "system-ui, sans-serif")
      .text(truncate(surname, maxTextW, 9))
      .style("cursor", "pointer");
  }

  // Lifespan
  const life = lifespan(person.birth_date, person.death_date);
  if (life) {
    g.append("text")
      .attr("x", textX)
      .attr("y", dim.height / 2 - 24)
      .attr("fill", "#a0c0b0")
      .attr("fill-opacity", 0.7)
      .attr("font-size", "9px")
      .attr("font-family", "system-ui, sans-serif")
      .text(life)
      .style("cursor", "pointer");
  }

  // Location
  if (person.birth_location) {
    g.append("text")
      .attr("x", textX)
      .attr("y", dim.height / 2 - 11)
      .attr("fill", "#a0c0b0")
      .attr("fill-opacity", 0.5)
      .attr("font-size", "8px")
      .attr("font-family", "system-ui, sans-serif")
      .text(truncate(person.birth_location, maxTextW, 8))
      .style("cursor", "pointer");
  }
}

function renderFallbackText(g: any, name: string) {
  g.append("text")
    .attr("text-anchor", "middle")
    .attr("dy", "0.35em")
    .attr("fill", "#e0f0e6")
    .attr("font-size", "11px")
    .attr("font-family", "system-ui, sans-serif")
    .text(name.length > 45 ? name.substring(0, 42) + "..." : name)
    .style("cursor", "pointer");
}

/** Rough character-width truncation for SVG text */
function truncate(text: string, maxPixels: number, fontSize: number): string {
  // Approximate: each character is ~0.6 × fontSize pixels wide
  const charWidth = fontSize * 0.6;
  const maxChars = Math.floor(maxPixels / charWidth);
  if (text.length <= maxChars) return text;
  return text.substring(0, maxChars - 1) + "…";
}

// Helper to load scripts dynamically
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
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
