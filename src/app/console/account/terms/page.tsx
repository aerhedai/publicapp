import { PolicyDocument } from "@/components/legal/policy-content";

// Same content as the public /terms page (src/app/terms/page.tsx) - one
// shared component (src/components/legal/policy-content.tsx), not two
// copies that can drift. This route stays for convenient in-app access
// once signed in; the public one is what a prospective user (or Clerk's
// legal-consent checkbox) actually needs before an account exists.
export default function TermsPage() {
  return <PolicyDocument />;
}
