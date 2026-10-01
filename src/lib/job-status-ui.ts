import { jobStatus } from "@/db/schema";

// Human labels + explanatory copy per status - "warming" specifically needs
// its own copy so a real cold start (RunPod dispatch -> container boot,
// realistically 30-90s, worst case a couple of minutes) doesn't read as a
// stuck/broken job. Colors are picked directly for this app's dark
// background (not light/dark variants - there's no light mode to switch
// between here, see src/app/layout.tsx's permanent `dark` class).
export const JOB_STATUS_CONFIG: Record<
  (typeof jobStatus.enumValues)[number],
  { label: string; className: string; detail?: string }
> = {
  queued: {
    label: "Queued",
    className: "bg-white/10 text-white/70",
    detail: "Waiting for a free GPU slot.",
  },
  warming: {
    label: "Starting up",
    className: "bg-amber-500/15 text-amber-300",
    detail: "Spinning up a GPU worker - can take up to a couple of minutes on a cold start.",
  },
  processing: {
    label: "Generating",
    className: "bg-cyan-500/15 text-cyan-300",
  },
  done: {
    label: "Done",
    className: "bg-emerald-500/15 text-emerald-300",
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/15 text-red-300",
  },
};
