import { auth, currentUser } from "@clerk/nextjs/server";
import { getCreditBalance } from "@/lib/credits";

export default async function ManageAccountPage() {
  const { userId } = await auth();
  if (!userId) return null; // layout already redirects; belt and suspenders

  const [user, credits] = await Promise.all([currentUser(), getCreditBalance(userId)]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-8 py-10">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Manage Account</h1>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-medium text-muted-foreground">Email</h2>
        <p className="mt-2 text-sm">{user?.primaryEmailAddress?.emailAddress ?? "—"}</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-sm font-medium text-muted-foreground">Credits</h2>
        <p className="mt-2 text-2xl font-semibold">{credits}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Plan management and billing aren&apos;t wired up yet.
        </p>
      </div>
    </div>
  );
}
