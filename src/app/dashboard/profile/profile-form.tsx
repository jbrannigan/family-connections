"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { updateDisplayName, updateAvatarUrl, deleteAvatar } from "./actions";
import { getRoleLabel } from "@/lib/roles";
import UserAvatar from "@/components/user-avatar";
import type { MemberRole } from "@/types/database";

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface ProfileFormProps {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  graphs: { id: string; name: string; role: MemberRole }[];
}

export default function ProfileForm({
  userId,
  email,
  displayName: initialName,
  avatarUrl: initialAvatarUrl,
  graphs,
}: ProfileFormProps) {
  // Display name state
  const [name, setName] = useState(initialName);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [uploading, setUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const nameChanged = name.trim() !== initialName && name.trim() !== "";

  async function handleSaveName() {
    if (!nameChanged) return;
    setSavingName(true);
    setNameError(null);
    setNameSaved(false);
    try {
      await updateDisplayName(name);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch (e) {
      setNameError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSavingName(false);
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setAvatarError("Please upload a JPEG, PNG, or WebP image.");
      return;
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      setAvatarError("Image must be smaller than 2MB.");
      return;
    }

    setUploading(true);
    setAvatarError(null);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${userId}/avatar.${ext}`;

      // Upload (upsert to replace existing)
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      // Append cache-buster so the browser fetches the new image
      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      // Update the profile record
      await updateAvatarUrl(publicUrl);
      setAvatarUrl(publicUrl);
    } catch (e) {
      setAvatarError(
        e instanceof Error ? e.message : "Failed to upload avatar",
      );
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDeleteAvatar() {
    setDeleting(true);
    setAvatarError(null);
    try {
      await deleteAvatar();
      setAvatarUrl(null);
    } catch (e) {
      setAvatarError(
        e instanceof Error ? e.message : "Failed to delete avatar",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* Avatar Section */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-white/40">
          Avatar
        </h2>
        <div className="flex items-center gap-6">
          <UserAvatar url={avatarUrl} name={name || email} size="lg" />
          <div className="space-y-3">
            <div className="flex flex-wrap gap-3">
              <label className="cursor-pointer rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-5 py-2 text-sm font-semibold text-[#0f1a14] transition hover:opacity-90">
                {uploading ? "Uploading..." : "Upload Photo"}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
              {avatarUrl && (
                <button
                  onClick={handleDeleteAvatar}
                  disabled={deleting}
                  className="rounded-xl border border-white/20 px-5 py-2 text-sm font-semibold text-white/60 transition hover:bg-white/5 hover:text-white disabled:opacity-50"
                >
                  {deleting ? "Removing..." : "Remove"}
                </button>
              )}
            </div>
            <p className="text-xs text-white/30">
              JPEG, PNG, or WebP. Max 2MB.
            </p>
          </div>
        </div>
        {avatarError && (
          <div className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {avatarError}
          </div>
        )}
      </section>

      {/* Display Name Section */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-white/40">
          Display Name
        </h2>
        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="Your name"
            className="w-full rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveName();
            }}
          />
          <p className="text-xs text-white/30">
            This is how your name appears to other members.
          </p>
          {nameError && (
            <div className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {nameError}
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveName}
              disabled={!nameChanged || savingName}
              className="rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-5 py-2 text-sm font-semibold text-[#0f1a14] transition hover:opacity-90 disabled:opacity-50"
            >
              {savingName ? "Saving..." : "Save"}
            </button>
            {nameSaved && (
              <span className="text-sm text-[#7fdb9a]">Saved!</span>
            )}
          </div>
        </div>
      </section>

      {/* Account Info */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-white/40">
          Account
        </h2>
        <div className="text-sm text-white/50">
          <span className="text-white/30">Email: </span>
          {email}
        </div>
      </section>

      {/* Graphs Section */}
      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-white/40">
          Your Graphs ({graphs.length})
        </h2>
        {graphs.length === 0 ? (
          <p className="text-sm text-white/30">
            You haven&apos;t joined any family graphs yet.
          </p>
        ) : (
          <div className="space-y-2">
            {graphs.map((graph) => (
              <Link
                key={graph.id}
                href={`/graph/${graph.id}`}
                className="flex items-center justify-between rounded-xl px-4 py-3 transition hover:bg-white/5"
              >
                <span className="text-sm font-medium">{graph.name}</span>
                <span className="rounded-full bg-[#7fdb9a]/10 px-2.5 py-0.5 text-xs font-semibold text-[#7fdb9a]">
                  {getRoleLabel(graph.role)}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
