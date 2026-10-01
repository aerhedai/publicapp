"use client";

import { useState } from "react";
import { useClerk } from "@clerk/nextjs";

// Two-step confirm (not a native confirm()/prompt(), to match this app's
// own styling) - the destructive action only fires on the second, explicit
// click, with a cancel escape hatch in between.
export function DeleteAccountButton() {
  const { signOut } = useClerk();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error("Couldn't delete your account - try again");
      await signOut({ redirectUrl: "/" });
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-sm font-medium text-red-400 transition-colors hover:text-red-300"
      >
        Delete account
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-red-500/20 bg-red-500/5 p-4">
      <p className="text-sm text-zinc-200">
        This permanently deletes your account, every creation, and every uploaded reference. This can&apos;t be undone.
      </p>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void handleDelete()}
          disabled={deleting}
          className="rounded-full bg-red-500 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-400 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Yes, delete everything"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={deleting}
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
