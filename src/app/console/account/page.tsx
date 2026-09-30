import { auth, currentUser } from "@clerk/nextjs/server";

export default async function AccountPage() {
  const { userId } = await auth();
  if (!userId) return null; // layout already redirects; belt and suspenders

  const user = await currentUser();
  const name = user?.fullName || user?.primaryEmailAddress?.emailAddress || "Account";
  const initial = name.charAt(0).toUpperCase();
  const joined = user?.createdAt ? new Date(user.createdAt) : null;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-8 py-10">
      <h1 className="font-display text-2xl font-semibold tracking-tight">Account</h1>

      <div className="flex items-center gap-4 rounded-3xl border border-border bg-card p-6">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--accent-from),var(--accent-to))] text-xl font-medium text-white">
          {initial}
        </div>
        <div>
          <p className="font-medium">{name}</p>
          <p className="text-sm text-muted-foreground">{user?.primaryEmailAddress?.emailAddress ?? "—"}</p>
          {joined && (
            <p className="mt-1 text-xs text-muted-foreground">Member since {joined.toLocaleDateString()}</p>
          )}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6">
        <h2 className="text-sm font-medium text-muted-foreground">Email</h2>
        <p className="mt-2 text-sm">{user?.primaryEmailAddress?.emailAddress ?? "—"}</p>
      </div>
    </div>
  );
}
