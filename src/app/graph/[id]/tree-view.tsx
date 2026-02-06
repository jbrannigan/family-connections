/* eslint-disable react-hooks/refs */
"use client";

import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import calcTree from "relatives-tree";
import type { RelData } from "relatives-tree/lib/types";
import type { Person, Relationship } from "@/types/database";
import {
  transformToTreeNodes,
  findRootPersonId,
  getConnectedComponent,
} from "@/lib/tree-transform";
import TreeNode from "./tree-node";
import TreeConnector from "./tree-connector";

const NODE_WIDTH = 160;
const NODE_HEIGHT = 100;
const MIN_SCALE = 0.1;
const MAX_SCALE = 2;
const ZOOM_STEP = 0.15;

interface TreeViewProps {
  graphId: string;
  persons: Person[];
  relationships: Relationship[];
}

export default function TreeView({
  graphId,
  persons,
  relationships,
}: TreeViewProps) {
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [treeData, setTreeData] = useState<RelData | null>(null);
  const [isComputing, setIsComputing] = useState(true);

  // Pan/zoom state
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isPanningRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Compute tree layout — filter to connected component of the root, then defer to avoid blocking paint
  useEffect(() => {
    if (persons.length === 0) {
      setTreeData(null);
      setIsComputing(false);
      return;
    }

    setIsComputing(true);

    const timeoutId = setTimeout(() => {
      console.log("[TreeView] Starting computation for", persons.length, "persons");

      const rootId = findRootPersonId(persons, relationships);
      console.log("[TreeView] Root ID:", rootId);
      if (!rootId) {
        setTreeData(null);
        setIsComputing(false);
        return;
      }

      // Only include persons in the same connected component as the root
      const componentIds = getConnectedComponent(persons, relationships, rootId);
      const filteredPersons = persons.filter((p) => componentIds.has(p.id));
      const filteredRels = relationships.filter(
        (r) => componentIds.has(r.person_a) && componentIds.has(r.person_b),
      );
      console.log("[TreeView] Connected component:", filteredPersons.length, "persons,", filteredRels.length, "relationships");

      console.log("[TreeView] Transforming to tree nodes...");
      const treeNodes = transformToTreeNodes(filteredPersons, filteredRels);
      console.log("[TreeView] Tree nodes created:", treeNodes.length);

      if (treeNodes.length === 0) {
        setTreeData(null);
        setIsComputing(false);
        return;
      }

      try {
        console.log("[TreeView] Calling calcTree...");
        const result = calcTree(treeNodes, { rootId });
        console.log("[TreeView] calcTree completed:", result.nodes.length, "nodes");
        setTreeData(result);
      } catch (err) {
        console.error("[TreeView] calcTree error:", err);
        setTreeData(null);
      }
      setIsComputing(false);
    }, 50);

    return () => clearTimeout(timeoutId);
  }, [persons, relationships]);

  const halfWidth = NODE_WIDTH / 2;
  const halfHeight = NODE_HEIGHT / 2;
  const canvasWidth = treeData ? treeData.canvas.width * halfWidth : 0;
  const canvasHeight = treeData ? treeData.canvas.height * halfHeight : 0;

  // Person lookup
  const personMap = useMemo(
    () => new Map(persons.map((p) => [p.id, p])),
    [persons],
  );

  // Deduplicate nodes — relatives-tree can return the same node ID multiple times
  const uniqueNodes = useMemo(() => {
    if (!treeData) return [];
    const seen = new Set<string>();
    return treeData.nodes.filter((node) => {
      if (seen.has(node.id)) return false;
      seen.add(node.id);
      return true;
    });
  }, [treeData]);

  // Auto-center on mount
  useEffect(() => {
    if (!treeData || !containerRef.current) return;
    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;

    if (canvasWidth === 0 || canvasHeight === 0) return;

    const scaleX = cw / canvasWidth;
    const scaleY = ch / canvasHeight;
    const fitScale = Math.min(scaleX, scaleY, 1) * 0.85;

    const scaledW = canvasWidth * fitScale;
    const scaledH = canvasHeight * fitScale;

    setTransform({
      x: (cw - scaledW) / 2,
      y: (ch - scaledH) / 2,
      scale: fitScale,
    });
  }, [treeData, canvasWidth, canvasHeight]);

  // Pan handlers
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;
      isPanningRef.current = true;
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isPanningRef.current) return;
      const dx = e.clientX - lastPosRef.current.x;
      const dy = e.clientY - lastPosRef.current.y;
      lastPosRef.current = { x: e.clientX, y: e.clientY };
      setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    },
    [],
  );

  const handlePointerUp = useCallback(() => {
    isPanningRef.current = false;
  }, []);

  // Wheel zoom toward cursor
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const cursorX = e.clientX - rect.left;
    const cursorY = e.clientY - rect.top;

    setTransform((prev) => {
      const direction = e.deltaY < 0 ? 1 : -1;
      const newScale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, prev.scale + direction * ZOOM_STEP),
      );
      const ratio = newScale / prev.scale;

      return {
        scale: newScale,
        x: cursorX - ratio * (cursorX - prev.x),
        y: cursorY - ratio * (cursorY - prev.y),
      };
    });
  }, []);

  // Zoom buttons
  const zoomIn = useCallback(
    () =>
      setTransform((prev) => ({
        ...prev,
        scale: Math.min(MAX_SCALE, prev.scale + ZOOM_STEP),
      })),
    [],
  );

  const zoomOut = useCallback(
    () =>
      setTransform((prev) => ({
        ...prev,
        scale: Math.max(MIN_SCALE, prev.scale - ZOOM_STEP),
      })),
    [],
  );

  const resetView = useCallback(() => {
    if (!treeData || !containerRef.current) return;
    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scaleX = cw / canvasWidth;
    const scaleY = ch / canvasHeight;
    const fitScale = Math.min(scaleX, scaleY, 1) * 0.85;
    const scaledW = canvasWidth * fitScale;
    const scaledH = canvasHeight * fitScale;
    setTransform({
      x: (cw - scaledW) / 2,
      y: (ch - scaledH) / 2,
      scale: fitScale,
    });
  }, [treeData, canvasWidth, canvasHeight]);

  const selectedPerson = selectedPersonId
    ? personMap.get(selectedPersonId)
    : null;

  if (isComputing) {
    return (
      <div className="rounded-2xl border border-dashed border-white/20 p-12 text-center">
        <div className="mb-3 text-4xl">🌳</div>
        <h3 className="mb-1 text-lg font-semibold">
          Computing tree layout&hellip;
        </h3>
        <p className="text-sm text-white/50">
          Laying out {persons.length} people.
        </p>
      </div>
    );
  }

  if (!treeData) {
    return (
      <div className="rounded-2xl border border-dashed border-white/20 p-12 text-center">
        <div className="mb-3 text-4xl">🌳</div>
        <h3 className="mb-1 text-lg font-semibold">
          Unable to render family tree
        </h3>
        <p className="text-sm text-white/50">
          Add more people and relationships to see the tree visualization.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Tree canvas */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#060e0a] select-none"
        style={{ height: "75vh", cursor: isPanningRef.current ? "grabbing" : "grab" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
      >
        {/* Zoom controls */}
        <div className="absolute right-4 top-4 z-20 flex flex-col gap-1.5">
          <button
            onClick={zoomIn}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white/70 transition hover:bg-white/20"
          >
            +
          </button>
          <button
            onClick={zoomOut}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm font-bold text-white/70 transition hover:bg-white/20"
          >
            −
          </button>
          <button
            onClick={resetView}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-[10px] font-bold text-white/70 transition hover:bg-white/20"
          >
            Fit
          </button>
        </div>

        {/* Scale indicator */}
        <div className="absolute bottom-4 left-4 z-20 rounded-lg bg-white/5 px-2.5 py-1 text-[10px] text-white/30">
          {Math.round(transform.scale * 100)}%
        </div>

        {/* Transformable canvas */}
        <div
          style={{
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            transformOrigin: "0 0",
            position: "relative",
            width: canvasWidth,
            height: canvasHeight,
          }}
        >
          {/* Connectors (behind nodes) */}
          {treeData.connectors.map((connector, idx) => (
            <TreeConnector
              key={idx}
              x1={connector[0]}
              y1={connector[1]}
              x2={connector[2]}
              y2={connector[3]}
              halfWidth={halfWidth}
              halfHeight={halfHeight}
            />
          ))}

          {/* Nodes */}
          {uniqueNodes.map((node) => (
            <TreeNode
              key={node.id}
              nodeId={node.id}
              top={node.top}
              left={node.left}
              person={personMap.get(node.id) ?? null}
              isPlaceholder={node.placeholder === true}
              halfWidth={halfWidth}
              halfHeight={halfHeight}
              isSelected={selectedPersonId === node.id}
              onClick={() =>
                setSelectedPersonId(
                  selectedPersonId === node.id ? null : node.id,
                )
              }
            />
          ))}
        </div>
      </div>

      {/* Selected person info panel */}
      {selectedPerson && (
        <div className="mt-4 rounded-2xl border border-[#7fdb9a]/20 bg-[#7fdb9a]/5 p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                {selectedPerson.display_name}
              </h3>
              {selectedPerson.pronouns && (
                <p className="text-sm text-white/40">
                  {selectedPerson.pronouns}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-white/50">
                {selectedPerson.birth_date && (
                  <span>Born: {selectedPerson.birth_date}</span>
                )}
                {selectedPerson.death_date && (
                  <span>Died: {selectedPerson.death_date}</span>
                )}
                {selectedPerson.birth_location && (
                  <span>{selectedPerson.birth_location}</span>
                )}
              </div>
              {selectedPerson.notes && (
                <p className="mt-2 text-sm text-white/40">
                  {selectedPerson.notes}
                </p>
              )}
            </div>
            <button
              onClick={() => setSelectedPersonId(null)}
              className="text-white/30 transition hover:text-white/60"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
