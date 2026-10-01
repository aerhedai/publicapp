// Static visual mockup, not a functional form - this page is public/
// unauthenticated (see src/proxy.ts), so real generation can't be wired up
// here. Its job is purely to make "AI video generation" concrete before a
// visitor has scrolled or signed up, the same device the BytePlus/Dreamina
// reference page uses. Clicking anywhere opens the sign-up modal.
import { AuthTrigger } from "@/components/auth/auth-trigger";

export function GeneratorPreview() {
  return (
    <AuthTrigger
      mode="sign-up"
      className="group block w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-4 text-left shadow-2xl backdrop-blur-xl transition-colors hover:border-white/20 sm:p-5"
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white">
          Video
        </span>
        <span className="rounded-full px-3 py-1 text-xs font-medium text-white/50">
          Image
        </span>
      </div>

      <p className="text-sm text-white/70">
        A woman stares out a rain-streaked window, city lights blurred behind
        her, camera pushing in slowly&hellip;
      </p>

      <div className="mt-4 flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-dashed border-white/25 text-white/40"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M12 5v14M5 12h14"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        ))}
        <span className="text-xs text-white/40">Reference images</span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="rounded-xl bg-white/10 px-2 py-1">1080p</span>
          <span className="rounded-xl bg-white/10 px-2 py-1">6s</span>
        </div>
        <span className="rounded-full bg-white px-5 py-2 text-sm font-medium text-neutral-900 transition-opacity group-hover:opacity-90">
          Generate
        </span>
      </div>
    </AuthTrigger>
  );
}
