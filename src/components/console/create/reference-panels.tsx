// Static UI only - these slots don't accept real uploads yet, same
// precedent as the rest of this tool's UI (Generate stays disabled).
function PlusIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function ReferenceSquare() {
  return (
    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-white/20 text-muted-foreground transition-colors hover:border-white/35 hover:text-foreground">
      <PlusIcon />
    </div>
  );
}

export function AddReferencesPanel({ subtitle }: { subtitle?: string }) {
  return (
    <div>
      <p className="text-sm font-medium">Add References</p>
      {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      <div className="mt-3 flex gap-2">
        <ReferenceSquare />
        <ReferenceSquare />
        <ReferenceSquare />
      </div>
    </div>
  );
}

export function LabeledImageSlot({ label, icon }: { label: string; icon: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-dashed border-white/20 text-muted-foreground transition-colors hover:border-white/35 hover:text-foreground">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
          {icon}
        </svg>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

export function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-1 text-center">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">Isn&apos;t wired up yet - coming soon.</p>
    </div>
  );
}
