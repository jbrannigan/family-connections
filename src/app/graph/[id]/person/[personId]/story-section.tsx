"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { StoryWithAuthor } from "@/types/database";
import { formatRelativeTime } from "@/lib/date-utils";
import { createStory, updateStory, deleteStory } from "./actions";

interface StorySectionProps {
  graphId: string;
  personId: string;
  personName: string;
  stories: StoryWithAuthor[];
  currentUserId: string;
  canAddStories?: boolean;
}

export default function StorySection({
  graphId,
  personId,
  personName,
  stories,
  currentUserId,
  canAddStories = true,
}: StorySectionProps) {
  const router = useRouter();

  // Add story state
  const [addingStory, setAddingStory] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newIsFunFact, setNewIsFunFact] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit story state
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editIsFunFact, setEditIsFunFact] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete confirmation state
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);

  async function handleAddStory() {
    setSaving(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("content", newContent);
      fd.set("is_fun_fact", newIsFunFact ? "true" : "false");
      await createStory(graphId, personId, fd);
      setNewContent("");
      setNewIsFunFact(false);
      setAddingStory(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save story");
    } finally {
      setSaving(false);
    }
  }

  function startEditing(story: StoryWithAuthor) {
    setEditingStoryId(story.id);
    setEditContent(story.content);
    setEditIsFunFact(story.is_fun_fact);
    setEditError(null);
  }

  function cancelEditing() {
    setEditingStoryId(null);
    setEditContent("");
    setEditIsFunFact(false);
    setEditError(null);
  }

  async function handleUpdateStory(storyId: string) {
    setEditSaving(true);
    setEditError(null);
    try {
      const fd = new FormData();
      fd.set("content", editContent);
      fd.set("is_fun_fact", editIsFunFact ? "true" : "false");
      await updateStory(graphId, personId, storyId, fd);
      cancelEditing();
      router.refresh();
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Failed to update story");
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDeleteStory(storyId: string) {
    setDeleting(true);
    try {
      await deleteStory(graphId, personId, storyId);
      setConfirmingDeleteId(null);
      router.refresh();
    } catch {
      // Deletion failed — just close the confirmation
      setConfirmingDeleteId(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wider text-white/40">
          Stories{stories.length > 0 && ` (${stories.length})`}
        </h2>
        {canAddStories && !addingStory && (
          <button
            onClick={() => {
              setAddingStory(true);
              setError(null);
            }}
            className="text-sm font-medium text-[#7fdb9a] transition hover:text-[#7fdb9a]/80"
          >
            + Add Story
          </button>
        )}
      </div>

      {/* Add Story Form */}
      {addingStory && (
        <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder={`Share a story or memory about ${personName}...`}
            rows={4}
            className="mb-3 w-full resize-none rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
            autoFocus
          />
          <div className="mb-3 flex items-center gap-2">
            <input
              type="checkbox"
              id="new-fun-fact"
              checked={newIsFunFact}
              onChange={(e) => setNewIsFunFact(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-[#7fdb9a] focus:ring-[#7fdb9a]"
            />
            <label
              htmlFor="new-fun-fact"
              className="text-sm text-white/60"
            >
              This is a fun fact
            </label>
          </div>
          {error && (
            <div className="mb-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleAddStory}
              disabled={saving || !newContent.trim()}
              className="rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-5 py-2 text-sm font-semibold text-[#0f1a14] transition hover:opacity-90 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Story"}
            </button>
            <button
              onClick={() => {
                setAddingStory(false);
                setNewContent("");
                setNewIsFunFact(false);
                setError(null);
              }}
              disabled={saving}
              className="rounded-xl border border-white/20 px-5 py-2 text-sm font-semibold transition hover:bg-white/5 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Story Cards */}
      <div className="space-y-4">
        {stories.map((story) =>
          editingStoryId === story.id ? (
            /* Edit Form */
            <div
              key={story.id}
              className="rounded-xl border border-[#7fdb9a]/30 bg-white/5 p-4"
            >
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={4}
                className="mb-3 w-full resize-none rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-[#7fdb9a] focus:outline-none"
                autoFocus
              />
              <div className="mb-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id={`edit-fun-fact-${story.id}`}
                  checked={editIsFunFact}
                  onChange={(e) => setEditIsFunFact(e.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-white/5 text-[#7fdb9a] focus:ring-[#7fdb9a]"
                />
                <label
                  htmlFor={`edit-fun-fact-${story.id}`}
                  className="text-sm text-white/60"
                >
                  This is a fun fact
                </label>
              </div>
              {editError && (
                <div className="mb-3 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
                  {editError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  onClick={() => handleUpdateStory(story.id)}
                  disabled={editSaving || !editContent.trim()}
                  className="rounded-xl bg-gradient-to-br from-[#7fdb9a] to-[#4a9d6a] px-5 py-2 text-sm font-semibold text-[#0f1a14] transition hover:opacity-90 disabled:opacity-50"
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={cancelEditing}
                  disabled={editSaving}
                  className="rounded-xl border border-white/20 px-5 py-2 text-sm font-semibold transition hover:bg-white/5 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            /* Story Card */
            <div
              key={story.id}
              className="rounded-xl border border-white/5 bg-white/5 p-4"
            >
              <div className="mb-2 flex items-start justify-between gap-2">
                <div>
                  {story.is_fun_fact && (
                    <span className="inline-block rounded-full bg-[#7fdb9a]/10 px-2.5 py-0.5 text-xs font-medium text-[#7fdb9a]">
                      Fun Fact
                    </span>
                  )}
                </div>
                {story.author_id === currentUserId && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      onClick={() => startEditing(story)}
                      className="text-xs text-white/30 transition hover:text-white/60"
                    >
                      Edit
                    </button>
                    {confirmingDeleteId === story.id ? (
                      <span className="flex items-center gap-2 text-xs">
                        <span className="text-white/40">Delete?</span>
                        <button
                          onClick={() => handleDeleteStory(story.id)}
                          disabled={deleting}
                          className="font-medium text-red-400 transition hover:text-red-300 disabled:opacity-50"
                        >
                          {deleting ? "..." : "Yes"}
                        </button>
                        <button
                          onClick={() => setConfirmingDeleteId(null)}
                          disabled={deleting}
                          className="text-white/40 transition hover:text-white/60"
                        >
                          No
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => setConfirmingDeleteId(story.id)}
                        className="text-xs text-red-400/60 transition hover:text-red-400"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
              <p className="whitespace-pre-wrap text-sm text-white/70">
                {story.content}
              </p>
              <div className="mt-3 flex items-center gap-2 text-xs text-white/30">
                {story.author_name && <span>{story.author_name}</span>}
                {story.author_name && <span>&middot;</span>}
                <span>{formatRelativeTime(story.created_at)}</span>
              </div>
            </div>
          ),
        )}
      </div>

      {/* Empty state */}
      {stories.length === 0 && !addingStory && (
        <p className="text-center text-sm text-white/40">
          No stories yet. Be the first to share a memory or fun fact!
        </p>
      )}
    </div>
  );
}
