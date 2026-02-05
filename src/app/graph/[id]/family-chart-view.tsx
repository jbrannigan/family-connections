"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import type { Person, Relationship } from "@/types/database";
import {
  transformToFamilyChartData,
  findRootPersonId,
  getConnectedComponent,
} from "@/lib/family-chart-transform";

interface FamilyChartViewProps {
  graphId: string;
  persons: Person[];
  relationships: Relationship[];
}

export default function FamilyChartView({
  graphId,
  persons,
  relationships,
}: FamilyChartViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<unknown>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);

  // Person lookup
  const personMap = useMemo(
    () => new Map(persons.map((p) => [p.id, p])),
    [persons],
  );

  // Transform data to family-chart format
  const chartData = useMemo(() => {
    if (persons.length === 0) return null;

    console.log("[FamilyChartView] Transforming data for", persons.length, "persons");

    const rootId = findRootPersonId(persons, relationships);
    console.log("[FamilyChartView] Root ID:", rootId);

    if (!rootId) return null;

    // Only include persons in the same connected component as the root
    const componentIds = getConnectedComponent(persons, relationships, rootId);
    const filteredPersons = persons.filter((p) => componentIds.has(p.id));
    const filteredRels = relationships.filter(
      (r) => componentIds.has(r.person_a) && componentIds.has(r.person_b),
    );

    console.log(
      "[FamilyChartView] Connected component:",
      filteredPersons.length,
      "persons,",
      filteredRels.length,
      "relationships",
    );

    const data = transformToFamilyChartData(filteredPersons, filteredRels);
    console.log("[FamilyChartView] Chart data created:", data.length, "nodes");

    return { data, rootId };
  }, [persons, relationships]);

  // Initialize chart
  useEffect(() => {
    if (!containerRef.current || !chartData) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const initChart = async () => {
      try {
        console.log("[FamilyChartView] Loading family-chart library...");

        // Dynamically import family-chart (it's a client-side library)
        const { createChart, cardSvg } = await import("family-chart");

        if (!isMounted || !containerRef.current) return;

        // Clear any existing content
        containerRef.current.innerHTML = "";

        console.log("[FamilyChartView] Creating chart...");

        // Create the chart
        const chart = createChart(containerRef.current, chartData.data);

        // Configure chart settings before setting up the card
        chart
          .setOrientationVertical()
          .setCardYSpacing(200)   // Vertical space between generations
          .setCardXSpacing(250)   // Horizontal space between siblings (must be > card width)
          .setTransitionTime(300)
          .setAncestryDepth(10)   // Show up to 10 generations of ancestors
          .setProgenyDepth(10);   // Show up to 10 generations of descendants

        // Setup the card renderer with custom display function for names
        const cardInstance = chart.setCardSvg();

        // Set card dimensions to avoid overlap
        cardInstance.setCardDim({
          w: 220,      // Card width
          h: 70,       // Card height
          text_x: 75,  // Text X offset (after image)
          text_y: 15,  // Text Y offset
          img_w: 60,   // Image width
          img_h: 60,   // Image height
          img_x: 5,    // Image X position
          img_y: 5,    // Image Y position
        });

        // Set card display function BEFORE updateTree
        // The function receives Datum object with .data containing our fields
        cardInstance.setCardDisplay((d: unknown) => {
          const datum = d as { data?: Record<string, unknown> };
          const personData = datum?.data || {};
          const firstName = (personData["first name"] as string) || "";
          const lastName = (personData["last name"] as string) || "";
          return `${firstName} ${lastName}`.trim() || "Unknown";
        });

        // Set the main person to the root
        chart.updateMainId(chartData.rootId);

        // Update and render - this should use the card_display function
        chart.updateTree({ initial: true, tree_position: "fit" });

        chartRef.current = chart;

        console.log("[FamilyChartView] Chart initialized successfully");
        setIsLoading(false);
        setError(null);
      } catch (err) {
        console.error("[FamilyChartView] Error initializing chart:", err);
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to initialize chart");
          setIsLoading(false);
        }
      }
    };

    setIsLoading(true);
    initChart();

    return () => {
      isMounted = false;
      // Cleanup chart if it has a destroy method
      if (chartRef.current && typeof (chartRef.current as { destroy?: () => void }).destroy === "function") {
        (chartRef.current as { destroy: () => void }).destroy();
      }
    };
  }, [chartData]);

  const selectedPerson = selectedPersonId
    ? personMap.get(selectedPersonId)
    : null;

  if (!chartData) {
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
      {/* Chart container - always render so ref is available */}
      <div
        ref={containerRef}
        className="family-chart-container relative overflow-hidden rounded-2xl border border-white/10 bg-[#060e0a]"
        style={{
          height: "75vh",
        }}
      />
      {/* Styles for family-chart SVG to fill container and dark theme */}
      <style jsx global>{`
        .family-chart-container svg.main_svg {
          width: 100% !important;
          height: 100% !important;
          display: block;
        }
        /* Dark theme for family-chart cards */
        .family-chart-container .card_cont .card-body-rect,
        .family-chart-container .card-body-rect {
          fill: #1a2f23 !important;
        }
        .family-chart-container .card-outline,
        .family-chart-container .card-main-outline {
          stroke: rgba(127, 219, 154, 0.3) !important;
          fill: none !important;
        }
        .family-chart-container .card-text text,
        .family-chart-container .card_cont text {
          fill: #ffffff !important;
        }
        .family-chart-container .link {
          stroke: rgba(127, 219, 154, 0.4) !important;
        }
      `}</style>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-[#060e0a]">
          <div className="text-center">
            <div className="mb-3 text-4xl">🌳</div>
            <h3 className="mb-1 text-lg font-semibold">
              Loading tree visualization&hellip;
            </h3>
            <p className="text-sm text-white/50">
              Preparing {persons.length} people.
            </p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-red-500/5">
          <div className="text-center">
            <div className="mb-3 text-4xl">⚠️</div>
            <h3 className="mb-1 text-lg font-semibold text-red-400">
              Error loading tree
            </h3>
            <p className="text-sm text-white/50">{error}</p>
          </div>
        </div>
      )}

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
