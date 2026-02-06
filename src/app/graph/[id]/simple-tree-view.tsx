"use client";

import { useEffect, useRef, useState } from "react";
import type { Person, Relationship } from "@/types/database";
import {
  transformToHierarchicalTree,
  type TreeDisplayNode,
} from "@/lib/dtree-transform";

interface SimpleTreeViewProps {
  persons: Person[];
  relationships: Relationship[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */

interface D3ZoomEvent {
  transform: { k: number; x: number; y: number };
}

// Node dimensions
const NODE_WIDTH = 280;
const NODE_HEIGHT = 50;
const NODE_H_SPACING = 40;
const NODE_V_SPACING = 80;

export default function SimpleTreeView({
  persons,
  relationships,
}: SimpleTreeViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nodeCount, setNodeCount] = useState(0);

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
          // Wait a tick for D3 to initialize
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        const d3 = (window as any).d3;
        if (!d3 || !d3.hierarchy) {
          throw new Error("D3 library failed to load properly. Please refresh the page.");
        }

        if (!mounted) return;

        // Transform data to hierarchical format
        const treeData = transformToHierarchicalTree(persons, relationships);

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

        // Create hierarchy
        const root = d3.hierarchy(rootData);

        // Count total nodes and max depth for sizing
        const descendants = root.descendants();
        const maxDepth = Math.max(...descendants.map((d: any) => d.depth));

        // Count nodes at each depth level
        const nodesPerLevel: number[] = [];
        for (const node of descendants) {
          nodesPerLevel[node.depth] = (nodesPerLevel[node.depth] || 0) + 1;
        }
        const maxNodesAtLevel = Math.max(...nodesPerLevel);

        // Calculate tree dimensions
        const treeWidth = maxNodesAtLevel * (NODE_WIDTH + NODE_H_SPACING);
        const treeHeight = (maxDepth + 1) * (NODE_HEIGHT + NODE_V_SPACING);

        // Create tree layout (horizontal orientation: root on left)
        const treeLayout = d3.tree()
          .nodeSize([NODE_HEIGHT + NODE_V_SPACING, NODE_WIDTH + NODE_H_SPACING])
          .separation(() => 1.2);

        // Apply layout
        treeLayout(root);

        // Get container dimensions
        const rect = container.getBoundingClientRect();
        const svgWidth = rect.width || 800;
        const svgHeight = rect.height || 600;

        // Create SVG
        const svg = d3.select(container)
          .append("svg")
          .attr("width", "100%")
          .attr("height", "100%")
          .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
          .style("background", "#0a1410");

        // Create zoom behavior
        const zoom = d3.zoom()
          .scaleExtent([0.1, 3])
          .on("zoom", (event: D3ZoomEvent) => {
            g.attr("transform", `translate(${event.transform.x},${event.transform.y}) scale(${event.transform.k})`);
          });

        svg.call(zoom as unknown);

        // Create main group for transformations
        const g = svg.append("g");

        // Initial transform to center the root
        const initialX = svgWidth / 4;
        const initialY = svgHeight / 2;
        svg.call(
          zoom.transform as unknown,
          d3.zoomIdentity.translate(initialX, initialY).scale(0.8),
        );

        // Draw links (connections between nodes)
        const linkGenerator = d3.linkHorizontal()
          .x((d: unknown) => (d as { y: number }).y)
          .y((d: unknown) => (d as { x: number }).x);

        g.selectAll(".link")
          .data(root.links())
          .enter()
          .append("path")
          .attr("class", "link")
          .attr("d", linkGenerator as unknown as string)
          .attr("fill", "none")
          .attr("stroke", "#7fdb9a")
          .attr("stroke-width", "1.5");

        // Draw nodes
        const nodes = g.selectAll(".node")
          .data(descendants)
          .enter()
          .append("g")
          .attr("class", "node")
          .attr("transform", (d: unknown) => {
            const node = d as { x: number; y: number };
            return `translate(${node.y},${node.x})`;
          });

        // Node background rectangles
        nodes.append("rect")
          .attr("x", -NODE_WIDTH / 2)
          .attr("y", -NODE_HEIGHT / 2)
          .attr("width", NODE_WIDTH)
          .attr("height", NODE_HEIGHT)
          .attr("rx", 6)
          .attr("fill", "#1a2f25")
          .attr("stroke", "#7fdb9a")
          .attr("stroke-width", 1.5)
          .style("cursor", "pointer");

        // Node text
        nodes.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .attr("fill", "#e0f0e6")
          .attr("font-size", "11px")
          .attr("font-family", "system-ui, sans-serif")
          .text((d: unknown) => {
            const node = d as { data: TreeDisplayNode };
            const name = node.data.name;
            // Truncate if too long
            return name.length > 45 ? name.substring(0, 42) + "..." : name;
          })
          .style("cursor", "pointer");

        // Add hover effects
        nodes.on("mouseover", function(this: any) {
          d3.select(this).select("rect")
            .attr("stroke-width", 2.5)
            .attr("stroke", "#a0f0b0");
        });

        nodes.on("mouseout", function(this: any) {
          d3.select(this).select("rect")
            .attr("stroke-width", 1.5)
            .attr("stroke", "#7fdb9a");
        });

        // Click to show full name in console (could be expanded to info panel)
        nodes.on("click", (_event: unknown, d: unknown) => {
          const node = d as { data: TreeDisplayNode };
          console.log("Selected:", node.data.name);
        });

        setIsLoading(false);
      } catch (err) {
        console.error("Tree render error:", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to render tree");
          setIsLoading(false);
        }
      }
    }

    loadAndRender();

    return () => {
      mounted = false;
    };
  }, [persons, relationships]);

  return (
    <div className="relative w-full h-full min-h-[600px] bg-[#0a1410]">
      {/* Info bar */}
      {!isLoading && !error && (
        <div className="absolute top-4 left-4 px-3 py-1 bg-[#1a2f25] rounded text-sm text-[#a0c0b0] border border-[#7fdb9a]/20">
          {nodeCount} family units • Scroll to zoom, drag to pan
        </div>
      )}

      {/* Tree container */}
      <div
        ref={containerRef}
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
    </div>
  );
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
