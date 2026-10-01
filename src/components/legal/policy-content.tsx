// Real draft legal text, written from this app's actual behavior (credits,
// auto-refund-on-failure, the real subprocessor list, the content policy
// that actually runs in content-policy.ts/output-moderation.ts,
// self-service deletion at /api/account) - not boilerplate, and not copied
// from any other company's terms. Business specifics confirmed 2026-10-01:
// support/DMCA contact is support@curealo.com, governing law is England and
// Wales (global users are unaffected - governing law picks which courts
// interpret the contract, not who can use the service; mandatory local
// consumer protections are explicitly preserved below regardless), $100 USD
// liability cap, no arbitration clause or class-action waiver (explicit
// choice, not a default). Still open: whether "Curealo" the product name is
// also the correct legal contracting party, or whether a registered entity
// (LLC/Ltd/Inc) should be named instead once one exists. Still needs an
// actual lawyer's review before launch - this fills in the blanks, not
// that step.
//
// Shared between the public /terms page (src/app/terms/page.tsx - has to be
// reachable without an account: a prospective user needs to be able to read
// this before signing up, and it's also what Clerk's "require legal
// consent" dashboard setting needs a real public URL for) and the
// in-console copy at /console/account/terms (same content, convenient
// in-app access once signed in) - one source of truth, not two copies that
// can drift.
export const LAST_UPDATED = "October 1, 2026";

export const TERMS_SECTIONS: { heading: string; paragraphs: string[] }[] = [
  {
    heading: "1. The service",
    paragraphs: [
      "Curealo (\"we\", \"us\") lets you generate short video clips and standalone images from text descriptions, optionally anchored to reference images or audio clips you upload. These Terms govern your use of the app at this domain and any related API.",
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
    heading: "7. AI-generated content - no guarantees",
    paragraphs: [
      "Outputs are produced by machine-learning models and can be inaccurate, unpredictable, or resemble existing third-party material by coincidence - we don't guarantee that any output is original, non-infringing, or fit for any particular purpose.",
      "You're responsible for reviewing an output before using it for any purpose - commercial, published, or otherwise - and for how you use it. Don't present AI-generated output as a genuine photo/video/recording of a real event without disclosing that it's AI-generated, where that could mislead someone.",
    ],
  },
  {
    heading: "8. Intellectual property and copyright complaints",
    paragraphs: [
      "The app itself (its code, design, and branding) is owned by us. These Terms don't grant you any rights to it beyond using the service as intended.",
      "If you believe content on this service infringes your copyright, send a notice to support@curealo.com including: your contact details, a description of the copyrighted work, the specific material you're reporting and where it is, and a statement that you have a good-faith belief the use isn't authorized. We'll remove or disable access to reported material and may terminate repeat infringers' accounts.",
    ],
  },
  {
    heading: "9. Disclaimer of warranties",
    paragraphs: [
      "The service is provided \"as is\" and \"as available,\" without warranties of any kind, express or implied, including merchantability, fitness for a particular purpose, and non-infringement. We don't warrant that the service will be uninterrupted, error-free, or meet your expectations.",
    ],
  },
  {
    heading: "10. Limitation of liability",
    paragraphs: [
      "To the maximum extent permitted by law, we aren't liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or goodwill, arising from your use of the service.",
      "Our total liability for any claim arising from these Terms or the service is limited to the amount you paid us in the 3 months before the claim arose, or $100 USD, whichever is greater.",
      "Some jurisdictions don't allow these limitations, so some of the above may not apply to you.",
    ],
  },
  {
    heading: "11. Indemnification",
    paragraphs: [
      "You agree to indemnify and hold us harmless from any claim, loss, or demand (including reasonable legal fees) arising from your use of the service, your generated content, or your violation of these Terms.",
    ],
  },
  {
    heading: "12. Suspension and termination",
    paragraphs: [
      "We may suspend or terminate your access for violating these Terms, including the Acceptable Use section, without liability to you for any resulting loss - though credits and generated content are handled the same as any other account deletion where reasonably possible.",
      "You may stop using the service and delete your account at any time (Account > Danger zone).",
    ],
  },
  {
    heading: "13. Governing law and disputes",
    paragraphs: [
      "These Terms are governed by the laws of England and Wales, without regard to conflict-of-law principles. This applies no matter which country you access the service from - choosing one governing law is standard practice for a service with users worldwide, and doesn't restrict who can use it.",
      "Before filing a claim, you agree to contact us at support@curealo.com and attempt to resolve the dispute informally for at least 30 days. Any dispute that isn't resolved informally is subject to the exclusive jurisdiction of the courts of England and Wales.",
      "If you're a consumer in a country whose local law gives you mandatory consumer protections, nothing in this section takes those away - it governs everything else about how these Terms are interpreted and enforced.",
    ],
  },
  {
    heading: "14. Changes to these Terms",
    paragraphs: [
      "We may update these Terms as the product changes. Continued use after an update means you accept the revised Terms. If a change is material, we'll make reasonable efforts to notify you (e.g. in-app or by email).",
    ],
  },
  {
    heading: "15. General",
    paragraphs: [
      "If any part of these Terms is found unenforceable, the rest remains in effect. These Terms, together with the Privacy, Cookie, and Refund Policies below, are the entire agreement between you and us about the service.",
    ],
  },
  {
    heading: "16. Contact",
    paragraphs: [
      "Questions about these Terms: support@curealo.com.",
    ],
  },
];

export const PRIVACY_SECTIONS: { heading: string; paragraphs: string[] }[] = [
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
      "We use the following subprocessors to operate the service, each only for the purpose of providing their part of it: Clerk (authentication), Stripe (payments), RunPod (GPU compute - your prompt and reference files are sent here to generate your output), Cloudflare (file storage for uploads and generated outputs via R2, and as the network/CDN provider in front of this entire site, meaning it sees the requests your browser makes to us), OpenRouter (prompt structuring and output content-safety screening), Upstash (rate limiting), Neon (database hosting), Sentry (error monitoring - when something breaks, technical details about that request are sent here to help us fix it), and Vercel (application hosting).",
      "We don't sell your personal information or your generated content to third parties. We may disclose information if required by law or a valid legal process.",
    ],
  },
  {
    heading: "4. International transfers",
    paragraphs: [
      "Our subprocessors (Section 3) may process data outside your own country. Where required, we rely on those providers' own standard contractual safeguards for cross-border transfer.",
    ],
  },
  {
    heading: "5. Retention and deletion",
    paragraphs: [
      "Your uploads and generated content are retained until you delete them individually, or until you delete your account.",
      "Deleting your account (Account > Danger zone) permanently deletes your account record, every upload, and every generated output, including from storage, and can't be undone or recovered by us afterward.",
    ],
  },
  {
    heading: "6. Your rights",
    paragraphs: [
      "You can access, export (by downloading), or delete any individual generation at any time from your Creations.",
      "You can delete your entire account and all associated data at any time, without contacting us, from Account > Danger zone.",
      "Depending on where you live, you may have additional rights over your personal data (e.g. GDPR/CCPA rights to access, correct, or restrict processing). Contact us at support@curealo.com with any request.",
    ],
  },
  {
    heading: "7. Children's privacy",
    paragraphs: [
      "This service isn't directed at anyone under 18, and we don't knowingly collect personal information from anyone under 18. If you believe a child has provided us with personal information, contact support@curealo.com and we'll delete it.",
    ],
  },
  {
    heading: "8. Contact",
    paragraphs: [
      "Questions about this Privacy Policy: support@curealo.com.",
    ],
  },
];

export const COOKIE_SECTIONS: { heading: string; paragraphs: string[] }[] = [
  {
    heading: "1. What we use",
    paragraphs: [
      "This service only uses strictly necessary cookies - nothing for advertising, cross-site tracking, or analytics profiling. Specifically: a session cookie from Clerk (keeps you signed in) and, only during checkout, cookies set by Stripe's hosted payment page.",
    ],
  },
  {
    heading: "2. Why no consent banner is required for these",
    paragraphs: [
      "Strictly necessary cookies (the kind that make the service itself work, like staying signed in) are exempt from opt-in consent requirements under most cookie-law frameworks, including GDPR's ePrivacy rules. The one-time notice shown on first visit is informational, not a consent gate, because there's nothing non-essential to opt into.",
    ],
  },
  {
    heading: "3. Browser storage",
    paragraphs: [
      "Separately from cookies, your browser's own local/session storage is used for a few per-device conveniences (e.g. remembering you've dismissed the cookie notice, caching a presigned media URL briefly so a thumbnail doesn't reload). This never leaves your browser and we never read it server-side.",
    ],
  },
  {
    heading: "4. Contact",
    paragraphs: [
      "Questions about this Cookie Policy: support@curealo.com.",
    ],
  },
];

export const REFUND_SECTIONS: { heading: string; paragraphs: string[] }[] = [
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
      "If you believe you were charged in error - a duplicate charge, or a sustained service outage that prevented you from using credits you purchased - contact support@curealo.com and we'll review it.",
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

function PolicyCard({
  id,
  title,
  sections,
}: {
  id: string;
  title: string;
  sections: { heading: string; paragraphs: string[] }[];
}) {
  return (
    <div id={id} className="scroll-mt-20 rounded-3xl border border-border bg-card p-6">
      <h2 className="font-medium">{title}</h2>
      <div className="mt-4 flex flex-col gap-5">
        {sections.map((s) => (
          <PolicySection key={s.heading} {...s} />
        ))}
      </div>
    </div>
  );
}

/** The full policy document body (title + all four cards) - rendered
 * identically by the public /terms page and the in-console
 * /console/account/terms page, so there's exactly one place this content
 * is written, not two that can drift apart. Each card has a real #id
 * (terms-of-service/privacy-policy/cookie-policy/refund-policy) so an
 * external link (e.g. Clerk's legal-consent setting, which wants separate
 * ToS and Privacy URLs) can deep-link straight to the relevant section. */
export function PolicyDocument() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-10 px-8 py-10">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Terms &amp; Policies</h1>
        <p className="mt-1 text-sm text-muted-foreground">Last updated {LAST_UPDATED}.</p>
      </div>

      <PolicyCard id="terms-of-service" title="Terms of Service" sections={TERMS_SECTIONS} />
      <PolicyCard id="privacy-policy" title="Privacy Policy" sections={PRIVACY_SECTIONS} />
      <PolicyCard id="cookie-policy" title="Cookie Policy" sections={COOKIE_SECTIONS} />
      <PolicyCard id="refund-policy" title="Refund Policy" sections={REFUND_SECTIONS} />
    </div>
  );
}
