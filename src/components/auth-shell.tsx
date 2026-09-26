import Link from "next/link";

// Shared page shell for /sign-in and /sign-up - keeps the branding panel in
// one place so both stay visually consistent. The Clerk widget itself
// (children) is already themed via src/lib/clerk-appearance.ts; this file
// is purely the page layout around it.
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid flex-1 md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-neutral-900 p-10 text-neutral-50 md:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
        <Link href="/" className="relative text-lg font-semibold tracking-tight">
          Your product name here
        </Link>
        <div className="relative space-y-3">
          <p className="text-2xl font-medium text-balance">
            Your landing-page tagline goes here.
          </p>
          <p className="text-sm text-neutral-400">
            Swap this copy (and the dot pattern above) once you've got real
            brand assets - see src/components/auth-shell.tsx.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        {children}
      </div>
    </div>
  );
}
