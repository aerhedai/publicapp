export function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex h-40 flex-col items-center justify-center gap-1 text-center">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">Isn&apos;t wired up yet - coming soon.</p>
    </div>
  );
}
