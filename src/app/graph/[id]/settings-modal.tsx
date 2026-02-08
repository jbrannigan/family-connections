"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  getMembers,
  renameGraph,
  updateMemberRole,
  removeMember,
  deleteGraph,
  transferOwnership,
} from "./actions";
import { getRoleLabel } from "@/lib/roles";
import type { MemberRole, MemberInfo } from "@/types/database";

type SettingsTab = "general" | "members" | "danger";

interface SettingsModalProps {
  graphId: string;
  graphName: string;
  userId: string;
  personCount: number;
  relationshipCount: number;
  isOpen: boolean;
  onClose: () => void;
  onRename: (newName: string) => void;
}

/**
 * Outer shell: renders backdrop when open, mounts/unmounts inner content.
 * This avoids setState-in-effect for tab reset — React naturally resets
 * state when SettingsModalContent unmounts.
 */
export default function SettingsModal({
  isOpen,
  onClose,
  ...rest
}: SettingsModalProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === backdropRef.current) {
      onClose();
    }
  }

  if (!isOpen) return null;

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
    >
      <SettingsModalContent onClose={onClose} {...rest} />
    </div>
  );
}

// ── Modal Content (mounts/unmounts with isOpen) ─────────────

function SettingsModalContent({
  graphId,
  graphName,
  userId,
  personCount,
  relationshipCount,
  onClose,
  onRename,
}: Omit<SettingsModalProps, "isOpen">) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: "general", label: "General" },
    { id: "members", label: "Members" },
    { id: "danger", label: "Danger Zone" },
  ];

  return (
    <div className="mx-4 w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f1a14] p-6 text-white shadow-2xl">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold">Graph Settings</h2>
          <p className="text-sm text-white/40">
            Manage your family graph
          </p>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-white/40 transition hover:bg-white/10 hover:text-white/60"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
              activeTab === tab.id
                ? tab.id === "danger"
                  ? "bg-red-500/10 text-red-400"
                  : "bg-[#7fdb9a]/20 text-[#7fdb9a]"
                : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "general" && (
        <GeneralTab
          graphId={graphId}
          graphName={graphName}
          onRename={onRename}
        />
      )}
      {activeTab === "members" && (
        <MembersTab graphId={graphId} userId={userId} />
      )}
      {activeTab === "danger" && (
        <DangerTab
          graphId={graphId}
          graphName={graphName}
          userId={userId}
          personCount={personCount}
          relationshipCount={relationshipCount}
        />
      )}
    </div>
  );
}

// ── General Tab ─────────────────────────────────────────────

function GeneralTab({
  graphId,
  graphName,
  onRename,
}: {
  graphId: string;
  graphName: string;
  onRename: (name: string) => void;
}) {
  const [name, setName] = useState(graphName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const isChanged = name.trim() !== graphName && name.trim() !== "";

  async function handleSave() {
    if (!isChanged) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await renameGraph(graphId, name);
      onRename(name.trim());
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to rename graph");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
          Graph Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
          }}
        />
      </div>
      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={!isChanged || saving}
          className="rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-5 py-2 text-sm font-semibold text-[#0f1a14] transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
        {saved && (
          <span className="text-sm text-[#7fdb9a]">Saved!</span>
        )}
      </div>
    </div>
  );
}

// ── Members Tab ─────────────────────────────────────────────

function MembersTab({
  graphId,
  userId,
}: {
  graphId: string;
  userId: string;
}) {
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMembers(graphId);
      setMembers(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [graphId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  async function handleRoleChange(targetUserId: string, newRole: MemberRole) {
    // Optimistic update
    setMembers((prev) =>
      prev.map((m) =>
        m.user_id === targetUserId ? { ...m, role: newRole } : m,
      ),
    );
    setError(null);
    try {
      await updateMemberRole(graphId, targetUserId, newRole);
    } catch (e) {
      // Revert on error
      setError(e instanceof Error ? e.message : "Failed to update role");
      fetchMembers();
    }
  }

  async function handleRemove(targetUserId: string) {
    setError(null);
    try {
      await removeMember(graphId, targetUserId);
      setMembers((prev) => prev.filter((m) => m.user_id !== targetUserId));
      setConfirmRemove(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove member");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-sm text-white/40">Loading members...</div>
      </div>
    );
  }

  const assignableRoles: MemberRole[] = ["editor", "contributor", "viewer"];

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <p className="text-xs font-medium uppercase tracking-wider text-white/40">
        Members ({members.length})
      </p>

      <div className="max-h-64 space-y-1 overflow-y-auto">
        {members.map((member) => {
          const isOwner = member.role === "owner";
          const isSelf = member.user_id === userId;
          const displayName = member.display_name || "Unnamed User";

          return (
            <div
              key={member.user_id}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/5"
            >
              {/* Avatar placeholder */}
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-bold text-white/60">
                {displayName.charAt(0).toUpperCase()}
              </div>

              {/* Name */}
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium">{displayName}</span>
                {isSelf && (
                  <span className="ml-1.5 text-xs text-white/30">(you)</span>
                )}
              </div>

              {/* Role badge / dropdown */}
              {isOwner || isSelf ? (
                <span className="rounded-full bg-[#7fdb9a]/10 px-2.5 py-0.5 text-xs font-semibold text-[#7fdb9a]">
                  {getRoleLabel(member.role)}
                </span>
              ) : confirmRemove === member.user_id ? (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-red-400">Remove?</span>
                  <button
                    onClick={() => handleRemove(member.user_id)}
                    className="font-semibold text-red-400 hover:text-red-300"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmRemove(null)}
                    className="text-white/40 hover:text-white/60"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <>
                  <select
                    value={member.role}
                    onChange={(e) =>
                      handleRoleChange(
                        member.user_id,
                        e.target.value as MemberRole,
                      )
                    }
                    className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-xs text-white focus:border-[#7fdb9a] focus:outline-none"
                  >
                    {assignableRoles.map((r) => (
                      <option key={r} value={r} className="bg-[#0f1a14]">
                        {getRoleLabel(r)}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => setConfirmRemove(member.user_id)}
                    className="rounded-lg px-2 py-1 text-xs text-red-400/60 transition hover:bg-red-500/10 hover:text-red-400"
                    title={`Remove ${displayName}`}
                  >
                    Remove
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Danger Zone Tab ─────────────────────────────────────────

function DangerTab({
  graphId,
  graphName,
  userId,
  personCount,
  relationshipCount,
}: {
  graphId: string;
  graphName: string;
  userId: string;
  personCount: number;
  relationshipCount: number;
}) {
  // Transfer ownership state
  const [members, setMembers] = useState<MemberInfo[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [transferTarget, setTransferTarget] = useState<string>("");
  const [transferring, setTransferring] = useState(false);
  const [confirmTransfer, setConfirmTransfer] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // Delete graph state
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const nameMatches = deleteConfirmation.trim() === graphName;
  const nonOwnerMembers = members.filter(
    (m) => m.user_id !== userId,
  );

  useEffect(() => {
    async function load() {
      try {
        const data = await getMembers(graphId);
        setMembers(data);
        const others = data.filter((m) => m.user_id !== userId);
        if (others.length > 0) {
          setTransferTarget(others[0].user_id);
        }
      } catch {
        // Members may fail to load; transfer section will show empty
      } finally {
        setLoadingMembers(false);
      }
    }
    load();
  }, [graphId, userId]);

  async function handleTransfer() {
    if (!transferTarget) return;
    setTransferring(true);
    setTransferError(null);
    try {
      await transferOwnership(graphId, transferTarget);
      // Page will revalidate and the user is no longer owner,
      // so the settings modal won't be accessible anymore.
      // Force a page reload to reflect the new role.
      window.location.reload();
    } catch (e) {
      setTransferError(
        e instanceof Error ? e.message : "Failed to transfer ownership",
      );
    } finally {
      setTransferring(false);
      setConfirmTransfer(false);
    }
  }

  async function handleDelete() {
    if (!nameMatches) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteGraph(graphId, deleteConfirmation);
      // Server action redirects to /dashboard
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e.message : "Failed to delete graph",
      );
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Transfer Ownership */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        <h3 className="mb-1 font-semibold text-red-400">
          Transfer Ownership
        </h3>
        <p className="mb-3 text-sm text-white/50">
          Transfer this graph to another member. You will become an Editor.
        </p>

        {transferError && (
          <div className="mb-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {transferError}
          </div>
        )}

        {loadingMembers ? (
          <p className="text-sm text-white/30">Loading members...</p>
        ) : nonOwnerMembers.length === 0 ? (
          <p className="text-sm text-white/30">
            No other members to transfer to. Invite someone first.
          </p>
        ) : confirmTransfer ? (
          <div className="space-y-3">
            <p className="text-sm text-white/70">
              Transfer ownership of{" "}
              <span className="font-semibold text-white">{graphName}</span> to{" "}
              <span className="font-semibold text-white">
                {nonOwnerMembers.find((m) => m.user_id === transferTarget)
                  ?.display_name || "Unnamed User"}
              </span>
              ? You will be demoted to Editor.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleTransfer}
                disabled={transferring}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {transferring ? "Transferring..." : "Confirm Transfer"}
              </button>
              <button
                onClick={() => setConfirmTransfer(false)}
                className="rounded-xl border border-white/20 px-4 py-2 text-sm font-semibold transition hover:bg-white/5"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <select
              value={transferTarget}
              onChange={(e) => setTransferTarget(e.target.value)}
              className="flex-1 rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-[#7fdb9a] focus:outline-none"
            >
              {nonOwnerMembers.map((m) => (
                <option
                  key={m.user_id}
                  value={m.user_id}
                  className="bg-[#0f1a14]"
                >
                  {m.display_name || "Unnamed User"} ({getRoleLabel(m.role)})
                </option>
              ))}
            </select>
            <button
              onClick={() => setConfirmTransfer(true)}
              className="shrink-0 rounded-xl border border-red-500/30 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
            >
              Transfer
            </button>
          </div>
        )}
      </div>

      {/* Delete Graph */}
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
        <h3 className="mb-1 font-semibold text-red-400">Delete Graph</h3>
        <p className="mb-1 text-sm text-white/50">
          Permanently delete{" "}
          <span className="font-semibold text-white">{graphName}</span> and all
          its data.
        </p>
        <p className="mb-3 text-sm text-white/40">
          This will delete {personCount}{" "}
          {personCount === 1 ? "person" : "people"},{" "}
          {relationshipCount}{" "}
          {relationshipCount === 1 ? "relationship" : "relationships"}, and all
          stories. This action cannot be undone.
        </p>

        {deleteError && (
          <div className="mb-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {deleteError}
          </div>
        )}

        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
          Type &ldquo;{graphName}&rdquo; to confirm
        </label>
        <input
          type="text"
          value={deleteConfirmation}
          onChange={(e) => setDeleteConfirmation(e.target.value)}
          placeholder={graphName}
          className="mb-3 w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/20 focus:border-red-400 focus:outline-none"
        />
        <button
          onClick={handleDelete}
          disabled={!nameMatches || deleting}
          className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete This Graph"}
        </button>
      </div>
    </div>
  );
}
