import { AuthCard } from "@/components/auth/auth-card";

// Full-page fallback for direct links and Clerk's own redirect target
// (src/proxy.ts's auth.protect() can only redirect to a real URL, not open
// the client-only modal - see src/components/auth/auth-modal.tsx) - styled
// identically to the modal via the same AuthCard, just centered on the
// page's own dark background instead of blurring over existing content.
export default function Page() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden p-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, color-mix(in srgb, var(--accent-from) 14%, transparent), transparent 45%), radial-gradient(circle at 80% 0%, color-mix(in srgb, var(--accent-to) 12%, transparent), transparent 50%)",
        }}
      />
      <AuthCard mode="sign-in" />
    </main>
  );
}
