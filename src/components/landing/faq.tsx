const FAQS = [
  {
    q: "What can I generate?",
    a: "Short video clips and standalone images from a text description, optionally anchored to one or more character reference images you upload.",
  },
  {
    q: "How does billing work?",
    a: "Credits are deducted when a generation is dispatched. Images cost 1 credit, videos cost 5. If a generation fails for any reason, the credit is automatically refunded.",
  },
  {
    q: "What happens if a generation fails?",
    a: "You're never charged for a failure - the credit reserved for that job is refunded automatically, and the job is marked failed with the reason.",
  },
  {
    q: "How long does a generation take?",
    a: "Typically under a minute once a GPU worker is warm. The very first request in a while can take up to a couple of minutes while a worker cold-starts.",
  },
];

export function FAQ() {
  return (
    <section className="border-t border-border px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <h2 className="text-center font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          FAQs
        </h2>

        <div className="mt-14 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {FAQS.map((item) => (
            <div key={item.q}>
              <h3 className="font-medium">{item.q}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
