import { AuthTrigger } from "@/components/auth/auth-trigger";

const CAPABILITIES = [
  {
    title: "Character Consistency",
    description:
      "Upload a reference image once - every scene keeps the same face, hair, and outfit.",
    icon: (
      <path
        d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Cinematic Camera Control",
    description:
      "Direct the shot with real camera language - push-ins, whip-pans, medium close-ups.",
    icon: (
      <path
        d="M3 7a2 2 0 012-2h9a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zM21 8l-4 2.5v3L21 16V8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Scene Continuity",
    description:
      "Chain scenes together so props, lighting, and state carry through a whole sequence.",
    icon: (
      <path
        d="M4 6h6v6H4V6zM14 6h6v6h-6V6zM4 16h6v2H4v-2zM14 16h6v2h-6v-2z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
  {
    title: "Fast Turnaround",
    description:
      "Runs on dedicated GPU workers that scale to zero - no queue when nobody's generating.",
    icon: (
      <path
        d="M13 2L4 14h6l-1 8 9-12h-6l1-8z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
  },
];

export function Capabilities() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for real production, not just demos
          </h2>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CAPABILITIES.map((c) => (
            <div
              key={c.title}
              className="flex flex-col rounded-3xl border border-border bg-card p-6"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5">
                <svg viewBox="0 0 24 24" fill="none" className="h-7 w-7 text-foreground">
                  {c.icon}
                </svg>
              </div>
              <h3 className="mt-4 font-display text-base font-medium">{c.title}</h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">
                {c.description}
              </p>
              <AuthTrigger
                mode="sign-up"
                className="mt-4 flex items-center gap-1 text-sm font-medium text-foreground transition-opacity hover:opacity-70"
              >
                Try it
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                  <path
                    d="M4 10h12M11 5l5 5-5 5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </AuthTrigger>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
