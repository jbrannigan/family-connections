"use client";

import { useState } from "react";
import InviteModal from "./invite-modal";
import type { MemberRole } from "@/types/database";

interface InviteButtonProps {
  graphId: string;
  graphName: string;
  role: MemberRole;
}

export default function InviteButton({
  graphId,
  graphName,
  role,
}: InviteButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-4 py-1.5 text-sm font-semibold text-[#0f1a14] transition hover:opacity-90"
      >
        Invite
      </button>
      <InviteModal
        graphId={graphId}
        graphName={graphName}
        role={role}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
