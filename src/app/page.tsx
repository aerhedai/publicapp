import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
        Your product name here
      </h1>
      <p className="max-w-xl text-balance text-muted-foreground">
        Landing page copy goes here - this page is intentionally public (see
        the allowlist in <code>src/proxy.ts</code>).
      </p>
      <div className="flex gap-3">
        <Link
          href="/sign-up"
          className="rounded-md bg-foreground px-5 py-2.5 text-sm font-medium text-background"
        >
          Get started
        </Link>
        <Link
          href="/sign-in"
          className="rounded-md border px-5 py-2.5 text-sm font-medium"
        >
          Sign in
        </Link>
      </div>
    </main>
  );
}
