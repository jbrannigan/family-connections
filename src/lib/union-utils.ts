/**
 * Union resolution utility.
 *
 * Maps raw relationship types to human-readable union concepts:
 *   spouse    → "Married"
 *   ex_spouse → "Divorced"
 *   partner   → "Partners"
 *
 * Unions are ordered chronologically by start_date, then alphabetically.
 */

import type { Person, Relationship, RelationshipType } from "@/types/database";

export type UnionType = "married" | "divorced" | "partners";

export interface Union {
  type: UnionType;
  label: string;
  icon: string;
  partner: Person;
  startDate: string | null;
  endDate: string | null;
  relationshipId: string;
}

const UNION_MAP: Record<string, { type: UnionType; label: string; icon: string }> = {
  spouse: { type: "married", label: "Married", icon: "💍" },
  ex_spouse: { type: "divorced", label: "Divorced", icon: "💔" },
  partner: { type: "partners", label: "Partners", icon: "🤝" },
};

const SPOUSE_TYPES = new Set<string>(["spouse", "ex_spouse", "partner"]);

/**
 * Resolve all unions for a given person from the relationships array.
 *
 * Returns unions sorted chronologically (by start_date), with null dates last,
 * then alphabetically by partner name.
 */
export function resolveUnions(
  personId: string,
  relationships: Relationship[],
  persons: Person[],
): Union[] {
  const personMap = new Map<string, Person>();
  for (const p of persons) {
    personMap.set(p.id, p);
  }

  const unions: Union[] = [];

  for (const rel of relationships) {
    if (!SPOUSE_TYPES.has(rel.type)) continue;

    const isA = rel.person_a === personId;
    const isB = rel.person_b === personId;
    if (!isA && !isB) continue;

    const partnerId = isA ? rel.person_b : rel.person_a;
    const partner = personMap.get(partnerId);
    if (!partner) continue;

    const mapping = UNION_MAP[rel.type];
    if (!mapping) continue;

    unions.push({
      type: mapping.type,
      label: mapping.label,
      icon: mapping.icon,
      partner,
      startDate: rel.start_date,
      endDate: rel.end_date,
      relationshipId: rel.id,
    });
  }

  // Sort: chronological by start_date (nulls last), then alphabetical by partner name
  unions.sort((a, b) => {
    const aDate = a.startDate ?? "";
    const bDate = b.startDate ?? "";
    if (aDate && bDate) {
      const cmp = aDate.localeCompare(bDate);
      if (cmp !== 0) return cmp;
    }
    if (aDate && !bDate) return -1;
    if (!aDate && bDate) return 1;
    return a.partner.display_name.localeCompare(b.partner.display_name);
  });

  return unions;
}

/**
 * Format a union date range for display.
 *
 * Examples:
 *   start=1958, end=1990  → "1958–1990"
 *   start=1958, end=null  → "since 1958"
 *   start=null, end=1990  → "until 1990"
 *   start=null, end=null  → null
 */
export function formatUnionDateRange(
  startDate: string | null,
  endDate: string | null,
): string | null {
  const start = yearFromDate(startDate);
  const end = yearFromDate(endDate);

  if (start && end) return `${start}–${end}`;
  if (start) return `since ${start}`;
  if (end) return `until ${end}`;
  return null;
}

/** Extract the year portion from a date string */
function yearFromDate(d: string | null): string | null {
  if (!d) return null;
  const m = d.match(/^(\d{4})/);
  return m ? m[1] : null;
}

/**
 * Get a human-readable union label for list view.
 *
 * Examples:
 *   spouse    → "Married to"
 *   ex_spouse → "Divorced from"
 *   partner   → "Partner of"
 */
export function getUnionLabel(relType: RelationshipType | string): string {
  switch (relType) {
    case "spouse":
      return "Married to";
    case "ex_spouse":
      return "Divorced from";
    case "partner":
      return "Partner of";
    default:
      return relType;
  }
}

/**
 * Get a compact union type label for tree nodes.
 *
 * Returns a short text indicator:
 *   spouse    → "Married"
 *   ex_spouse → "Divorced"
 *   partner   → "Partners"
 */
export function getUnionTypeLabel(relType: string): string {
  return UNION_MAP[relType]?.label ?? relType;
}
