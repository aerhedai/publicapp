// Real draft legal text, replacing the previous placeholder structure -
// written from this app's actual behavior (credits, auto-refund-on-failure,
// the real subprocessor list, the content policy that actually runs in
// content-policy.ts/output-moderation.ts, self-service deletion at
// /api/account). [BRACKETED] spots are the handful of specifics only the
// business itself can fill in (legal entity name, jurisdiction, a real
// contact address) - everything else here is accurate to the live product,
// not boilerplate. Still needs an actual legal review before launch; this
// closes the "it's literally placeholder text" gap, not that step.
const LAST_UPDATED = "October 1, 2026";

const TERMS_SECTIONS: { heading: string; paragraphs: string[] }[] = [
  {
    heading: "1. The service",
    paragraphs: [
      "VidGen (\"we\", \"us\") lets you generate short video clips and standalone images from text descriptions, optionally anchored to reference images or audio clips you upload. These Terms govern your use of the app at this domain and any related API.",
      "You must be at least 18 years old to create an account.",
    ],
  },
  {
    heading: "2. Your account",
    paragraphs: [
      "Accounts are authenticated through Clerk. You're responsible for keeping your login secure and for all activity under your account.",
      "You can permanently delete your account at any time from Account > Danger zone. This immediately deletes your account, every generation, and every uploaded reference, and can't be undone.",
    ],
  },
  {
    heading: "3. Credits and billing",
    paragraphs: [
      "Generations are paid for with credits, purchased either as a non-expiring one-time top-up or a monthly subscription that grants a fresh batch of credits each billing cycle. Both add to the same balance. Current tiers and prices are shown on the Plan page.",
      "A credit is reserved when you start a generation and only actually spent if it completes successfully. If a generation fails for any reason - including being blocked by our content safety check (Section 5) - the reserved credit is automatically refunded to your balance. You are never charged for a failure.",
      "Payments are processed by Stripe. We don't store your card details ourselves.",
    ],
  },
  {
    heading: "4. Ownership of what you generate",
    paragraphs: [
      "As between you and us, you own the outputs you generate, subject to your compliance with these Terms and to the rights of any underlying reference material you upload. You're responsible for having the rights to anything you upload as a reference.",
      "We don't claim ownership over your prompts or your generated outputs. We may process them as described in our Privacy Policy (Section 6) to operate and improve the service.",
    ],
  },
  {
    heading: "5. Acceptable use",
    paragraphs: [
      "You may not use the service to generate, upload, or attempt to generate: content depicting minors in a sexual context, non-consensual intimate imagery of real people, content intended to defraud or impersonate a real person without their consent, or content whose primary purpose is graphic violence or gore.",
      "Prompts are screened before a generation starts, and generated images are screened again before being shown to you, using automated filters. A blocked attempt doesn't cost you a credit. We may suspend or terminate accounts that repeatedly attempt to violate this policy.",
      "You may not use the service to build a competing product by systematically scraping or reselling outputs at scale, or attempt to circumvent rate limits or credit metering.",
    ],
  },
  {
    heading: "6. Service availability",
    paragraphs: [
      "Generation runs on on-demand GPU infrastructure that can take longer to respond when scaling up from idle (a \"cold start\"), typically under a minute once warm. We don't guarantee uninterrupted availability.",
    ],
  },
  {
    heading: "7. Changes",
    paragraphs: [
      "We may update these Terms as the product changes. Continued use after an update means you accept the revised Terms.",
    ],
  },
  {
    heading: "8. Contact",
    paragraphs: [
      "Questions about these Terms: [SUPPORT EMAIL].",
    ],
  },
];

const PRIVACY_SECTIONS: { heading: string; paragraphs: string[] }[] = [
  {
    heading: "1. What we collect",
    paragraphs: [
      "Account info: your email address and name, via Clerk (our authentication provider).",
      "Content you provide: text prompts, and any reference images/video/audio you upload.",
      "Generated content: the images and videos the service produces for you.",
      "Billing info: handled directly by Stripe - we receive your purchase history and subscription status, never your raw card number.",
      "Basic usage data: timestamps and status of your generations, for the purpose of operating the credit system and rate limits.",
    ],
  },
  {
    heading: "2. How we use it",
    paragraphs: [
      "To operate the service: running your generations, maintaining your credit balance, and enforcing per-account rate limits.",
      "To keep the service safe: your prompts are screened by an automated filter before a generation starts, and generated images are screened again by an automated content-safety model before being shown to you (Section 5 of the Terms).",
      "To structure multi-turn requests: when you describe a scene conversationally, your message text is sent to a third-party language model (via OpenRouter) to help turn it into a structured generation request.",
    ],
  },
  {
    heading: "3. Who we share it with",
    paragraphs: [
      "We use the following subprocessors to operate the service, each only for the purpose of providing their part of it: Clerk (authentication), Stripe (payments), RunPod (GPU compute - your prompt and reference files are sent here to generate your output), Cloudflare R2 (file storage for uploads and generated outputs), OpenRouter (prompt structuring and output content-safety screening), Upstash (rate limiting), Neon (database hosting), and Vercel (application hosting).",
      "We don't sell your personal information or your generated content to third parties.",
    ],
  },
  {
    heading: "4. Retention and deletion",
    paragraphs: [
      "Your uploads and generated content are retained until you delete them individually, or until you delete your account.",
      "Deleting your account (Account > Danger zone) permanently deletes your account record, every upload, and every generated output, including from storage, and can't be undone or recovered by us afterward.",
    ],
  },
  {
    heading: "5. Your rights",
    paragraphs: [
      "You can access, export (by downloading), or delete any individual generation at any time from your Creations.",
      "You can delete your entire account and all associated data at any time, without contacting us, from Account > Danger zone.",
      "Depending on where you live, you may have additional rights over your personal data. Contact us at [SUPPORT EMAIL] with any request.",
    ],
  },
  {
    heading: "6. Contact",
    paragraphs: [
      "Questions about this Privacy Policy: [SUPPORT EMAIL].",
    ],
  },
];

const REFUND_SECTIONS: { heading: string; paragraphs: string[] }[] = [
  {
    heading: "1. Failed generations",
    paragraphs: [
      "If a generation fails for any reason - a processing error, or being blocked by our content safety check - the credit reserved for it is automatically refunded to your balance immediately. No request is needed, and this happens every time, not case-by-case.",
    ],
  },
  {
    heading: "2. Credit purchases",
    paragraphs: [
      "One-time credit top-ups don't expire, but are non-refundable once purchased, except as required by law.",
      "Monthly subscriptions can be cancelled at any time from the Plan page and take effect at the end of the current billing period - you keep access and any already-granted credits through the end of the period you paid for. We don't provide partial-period refunds for mid-cycle cancellation.",
    ],
  },
  {
    heading: "3. Exceptional circumstances",
    paragraphs: [
      "If you believe you were charged in error - a duplicate charge, or a sustained service outage that prevented you from using credits you purchased - contact [SUPPORT EMAIL] and we'll review it.",
    ],
  },
];

function PolicySection({ heading, paragraphs }: { heading: string; paragraphs: string[] }) {
  return (
    <div>
      <h3 className="text-sm font-medium text-foreground">{heading}</h3>
      <div className="mt-2 flex flex-col gap-2">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-sm leading-relaxed text-muted-foreground">
            {p}
          </p>
        ))}
      </div>
    </div>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-8 py-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Terms &amp; Policies</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last updated {LAST_UPDATED}.</p>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-medium">Terms of Service</h2>
        <div className="mt-4 flex flex-col gap-5">
          {TERMS_SECTIONS.map((s) => (
            <PolicySection key={s.heading} {...s} />
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-medium">Privacy Policy</h2>
        <div className="mt-4 flex flex-col gap-5">
          {PRIVACY_SECTIONS.map((s) => (
            <PolicySection key={s.heading} {...s} />
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-border bg-card p-6">
        <h2 className="font-medium">Refund Policy</h2>
        <div className="mt-4 flex flex-col gap-5">
          {REFUND_SECTIONS.map((s) => (
            <PolicySection key={s.heading} {...s} />
          ))}
        </div>
      </div>
    </div>
  );
}
