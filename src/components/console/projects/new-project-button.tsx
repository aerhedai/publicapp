"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function NewProjectButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate() {
    if (!title.trim() || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      if (!res.ok) throw new Error("Couldn't create project");
      const { project } = await res.json();
      router.push(`/console/projects/${project.id}`);
    } catch {
      setCreating(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] px-5 py-2 text-sm font-medium text-white transition-transform duration-150 ease-out active:scale-[0.97]"
      >
        New storyboard
      </button>
    );
  }

  return (
    <div className="animate-popover-in flex items-center gap-2 rounded-full border border-border bg-card px-2 py-1">
      <input
        autoFocus
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && void handleCreate()}
        placeholder="Storyboard title"
        className="w-48 bg-transparent px-3 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none"
      />
      <button
        type="button"
        disabled={!title.trim() || creating}
        onClick={() => void handleCreate()}
        className="rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] px-4 py-1.5 text-sm font-medium text-white transition-transform duration-150 ease-out active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {creating ? "Creating..." : "Create"}
      </button>
    </div>
  );
}
