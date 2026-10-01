import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { ConsoleShell } from "@/components/console/console-shell";
import { getCreditBalance } from "@/lib/credits";

// src/proxy.ts already default-denies everything not on its public
// allowlist, so an unauthenticated request never reaches this far - the
// check + redirect here is defense in depth, not reliance on a single layer
// (same reasoning as the old dashboard page it replaces).
export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in");
  }

  const credits = await getCreditBalance(userId);

  return <ConsoleShell credits={credits}>{children}</ConsoleShell>;
}
