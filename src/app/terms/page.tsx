import { PolicyDocument } from "@/components/legal/policy-content";

// Public route (see src/proxy.ts's allowlist) - this has to be reachable
// without an account. Two real reasons, not just tidiness: a prospective
// user should be able to read these before signing up, and Clerk's
// "require legal consent" dashboard setting (clerk.com/docs/guides/secure/
// legal-compliance) needs a real public URL to point its ToS/Privacy
// checkbox links at. Before this existed, the footer linked to /terms and
// /privacy and neither route existed at all - a confirmed 404, found while
// checking whether "is the legal done" was actually true end to end.
export default function PublicTermsPage() {
  return <PolicyDocument />;
}
