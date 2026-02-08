"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getOrCreateInviteLink, deleteInviteLink } from "./actions";
import { getRoleLabel, getInvitableRoles } from "@/lib/roles";
import type { MemberRole, InviteLink } from "@/types/database";
import QRCode from "qrcode";

interface InviteModalProps {
  graphId: string;
  graphName: string;
  role: MemberRole;
  isOpen: boolean;
  onClose: () => void;
}

const ROLE_DESCRIPTIONS: Record<string, string> = {
  editor: "Can edit family members, relationships, and add stories",
  contributor: "Can view the tree and add stories about family members",
  viewer: "Can view the family tree and read stories (read-only)",
};

export default function InviteModal({
  graphId,
  graphName,
  role,
  isOpen,
  onClose,
}: InviteModalProps) {
  const invitableRoles = getInvitableRoles(role);
  const [selectedRole, setSelectedRole] = useState<MemberRole>(
    invitableRoles[invitableRoles.length - 1] ?? "viewer",
  );
  const [linkCache, setLinkCache] = useState<Record<string, InviteLink>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const currentLink = linkCache[selectedRole] ?? null;

  const fetchLink = useCallback(async (targetRole: MemberRole) => {
    setLoading(true);
    setError(null);
    try {
      const link = await getOrCreateInviteLink(graphId, targetRole);
      setLinkCache((prev) => ({ ...prev, [targetRole]: link }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate link");
    } finally {
      setLoading(false);
    }
  }, [graphId]);

  // Fetch link for the selected role when modal opens or role changes
  useEffect(() => {
    if (isOpen && selectedRole && !linkCache[selectedRole]) {
      fetchLink(selectedRole);
    }
  }, [isOpen, selectedRole, linkCache, fetchLink]);

  // Generate QR code when showing it
  useEffect(() => {
    if (showQR && currentLink) {
      const url = `${window.location.origin}/join/${currentLink.token}`;
      QRCode.toDataURL(url, {
        width: 256,
        margin: 2,
        color: {
          dark: "#0f1a14",
          light: "#ffffff",
        },
      }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
    }
  }, [showQR, currentLink]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCopied(false);
      setShowQR(false);
      setQrDataUrl(null);
      setError(null);
    }
  }, [isOpen]);

  function getInviteUrl(): string {
    if (!currentLink) return "";
    return `${window.location.origin}/join/${currentLink.token}`;
  }

  async function handleCopy() {
    const url = getInviteUrl();
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleDelete() {
    if (!currentLink) return;
    setDeleting(true);
    try {
      await deleteInviteLink(graphId, currentLink.id);
      setLinkCache((prev) => {
        const next = { ...prev };
        delete next[selectedRole];
        return next;
      });
      setShowQR(false);
      setQrDataUrl(null);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to revoke link",
      );
    } finally {
      setDeleting(false);
    }
  }

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
      <div className="mx-4 w-full max-w-lg rounded-2xl border border-white/10 bg-[#0f1a14] p-6 text-white shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold">Invite to {graphName}</h2>
            <p className="text-sm text-white/40">
              Share a link to invite family members
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

        {/* Role Tabs */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-white/40">
            Invite as
          </p>
          <div className="flex gap-2">
            {invitableRoles.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setSelectedRole(r);
                  setCopied(false);
                  setShowQR(false);
                  setQrDataUrl(null);
                }}
                className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                  selectedRole === r
                    ? "bg-[#7fdb9a]/20 text-[#7fdb9a]"
                    : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                }`}
              >
                {getRoleLabel(r)}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-white/30">
            {ROLE_DESCRIPTIONS[selectedRole]}
          </p>
        </div>

        {/* Link Display */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-white/40">Generating link...</div>
          </div>
        ) : currentLink ? (
          <div className="space-y-3">
            {/* Link URL + Copy */}
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="min-w-0 flex-1 truncate font-mono text-sm text-white/60">
                {getInviteUrl()}
              </div>
              <button
                onClick={handleCopy}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  copied
                    ? "bg-[#7fdb9a]/20 text-[#7fdb9a]"
                    : "bg-white/10 text-white/60 hover:bg-white/15 hover:text-white/80"
                }`}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowQR(!showQR)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition ${
                  showQR
                    ? "bg-[#7fdb9a]/20 text-[#7fdb9a]"
                    : "bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60"
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="8" height="8" rx="1" />
                  <rect x="14" y="2" width="8" height="8" rx="1" />
                  <rect x="2" y="14" width="8" height="8" rx="1" />
                  <rect x="14" y="14" width="4" height="4" rx="1" />
                  <rect x="20" y="14" width="2" height="2" />
                  <rect x="14" y="20" width="2" height="2" />
                  <rect x="20" y="20" width="2" height="2" />
                </svg>
                {showQR ? "Hide QR" : "Show QR"}
              </button>

              {role === "owner" && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium text-red-400/60 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                >
                  {deleting ? "Revoking..." : "Revoke Link"}
                </button>
              )}
            </div>

            {/* QR Code */}
            {showQR && qrDataUrl && (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-white p-6">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={qrDataUrl}
                  alt="QR code for invite link"
                  width={256}
                  height={256}
                  className="rounded-lg"
                />
                <p className="text-center text-xs text-gray-500">
                  Scan to join as{" "}
                  <span className="font-semibold">
                    {getRoleLabel(selectedRole)}
                  </span>
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8">
            <button
              onClick={() => fetchLink(selectedRole)}
              className="rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-5 py-2 text-sm font-semibold text-[#0f1a14] transition hover:opacity-90"
            >
              Generate Invite Link
            </button>
          </div>
        )}

        {/* Invite code fallback */}
        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="text-center text-xs text-white/30">
            Or share the graph invite code from the dashboard for basic
            viewer access.
          </p>
        </div>
      </div>
    </div>
  );
}
