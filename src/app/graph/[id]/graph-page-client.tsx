"use client";

import { useState } from "react";
import Link from "next/link";
import GraphViewToggle from "./graph-view-toggle";
import ExportButton from "./export-button";
import InviteButton from "./invite-button";
import SettingsButton from "./settings-button";
import GuestModeToggle from "./guest-mode-toggle";
import GuestModeBanner from "./guest-mode-banner";
import { GuestModeProvider, useGuestMode } from "@/lib/guest-mode";
import {
  canExport,
  canImport,
  canInvite,
  canManageMembers,
  canUseGuestMode,
  getRoleLabel,
} from "@/lib/roles";
import type { MemberRole, Person, Relationship } from "@/types/database";

interface GraphPageClientProps {
  graphId: string;
  graphName: string;
  role: MemberRole;
  userId: string;
  userEmail: string;
  persons: Person[];
  relationships: Relationship[];
  storyCountMap: Record<string, number>;
}

function GraphPageInner({
  graphId,
  graphName,
  role,
  userId,
  userEmail,
  persons,
  relationships,
  storyCountMap,
}: GraphPageClientProps) {
  const { isGuestMode } = useGuestMode();
  const [displayName, setDisplayName] = useState(graphName);

  // In guest mode, override role to viewer-equivalent for UI checks
  const effectiveRole: MemberRole = isGuestMode ? "viewer" : role;

  return (
    <div className="min-h-screen bg-[#0a1410] text-white">
      <header className="border-b border-white/10 bg-[#0f1a14]/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] text-lg">
              🌳
            </div>
            <span className="text-lg font-bold text-[#7fdb9a]">
              Family Connections
            </span>
          </Link>
          <span className="text-sm text-white/50">{userEmail}</span>
        </div>
      </header>

      <GuestModeBanner />

      <main className="mx-auto px-6 py-12">
        <div className="mb-2 flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-white/40 hover:text-white/60"
          >
            &larr; Dashboard
          </Link>
        </div>

        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold">{displayName}</h1>
          </div>
          <div className="flex items-center gap-3">
            {canUseGuestMode(role) && <GuestModeToggle />}
            {canManageMembers(effectiveRole) && (
              <SettingsButton
                graphId={graphId}
                graphName={displayName}
                userId={userId}
                personCount={persons.length}
                relationshipCount={relationships.length}
                onRename={setDisplayName}
              />
            )}
            {canInvite(effectiveRole) && (
              <InviteButton
                graphId={graphId}
                graphName={displayName}
                role={role}
              />
            )}
            {canExport(effectiveRole) && <ExportButton graphId={graphId} />}
            {canImport(effectiveRole) && (
              <Link
                href={`/graph/${graphId}/import`}
                className="rounded-xl border border-white/20 px-4 py-1.5 text-sm font-semibold transition hover:bg-white/5"
              >
                Import TreeDown
              </Link>
            )}
            <span className="rounded-full bg-[#7fdb9a]/10 px-3 py-1 text-xs font-semibold text-[#7fdb9a]">
              {isGuestMode ? "Guest" : getRoleLabel(role)}
            </span>
          </div>
        </div>

        <GraphViewToggle
          graphId={graphId}
          persons={persons}
          relationships={relationships}
          role={effectiveRole}
          storyCountMap={storyCountMap}
        />
      </main>
    </div>
  );
}

export default function GraphPageClient(props: GraphPageClientProps) {
  return (
    <GuestModeProvider userId={props.userId}>
      <GraphPageInner {...props} />
    </GuestModeProvider>
  );
}
