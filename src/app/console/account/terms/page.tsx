const SECTIONS = [
  {
    title: "Terms of Service",
    body: "The terms governing use of this app - acceptable use, account responsibilities, generated-content ownership, and service limits.",
  },
  {
    title: "Privacy Policy",
    body: "What's collected (account info, uploaded reference images, generation prompts/outputs) and how it's used, stored, and retained.",
  },
  {
    title: "Refund Policy",
    body: "When a credit purchase is refundable, and how failed generations are automatically refunded to your credit balance.",
  },
];

export default function TermsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-8 py-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Terms &amp; Policies</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Placeholder structure - the actual legal text for each section below isn&apos;t written yet.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {SECTIONS.map((section) => (
          <div key={section.title} className="rounded-3xl border border-border bg-card p-6">
            <h2 className="font-medium">{section.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{section.body}</p>
            <p className="mt-3 text-xs text-muted-foreground/70">Not finalized yet.</p>
          </div>
        ))}
      </div>
    </div>
  );
}
