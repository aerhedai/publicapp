import Link from "next/link";
import { AuthTrigger } from "@/components/auth/auth-trigger";

const LINK_CLASS = "text-sm text-muted-foreground transition-colors hover:text-foreground";

type FooterLink =
  | { label: string; href: string }
  | { label: string; authMode: "sign-in" | "sign-up" };

const COLUMNS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Pricing", href: "/#pricing" },
      { label: "Capabilities", href: "/#capabilities" },
      { label: "Sign up", authMode: "sign-up" as const },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Support", href: "/support" },
      { label: "Log in", authMode: "sign-in" as const },
      { label: "Console", authMode: "sign-in" as const },
    ],
  },
  {
    heading: "Legal",
    links: [
      // Real, public routes with real anchor ids (src/components/legal/
      // policy-content.tsx) - previously pointed at /terms and /privacy,
      // neither of which existed at all (a confirmed 404 on both).
      { label: "Terms of Service", href: "/terms#terms-of-service" },
      { label: "Privacy Policy", href: "/terms#privacy-policy" },
      { label: "Cookie Policy", href: "/terms#cookie-policy" },
      { label: "Refund Policy", href: "/terms#refund-policy" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid gap-10 sm:grid-cols-4">
          <div>
            <span className="font-display text-lg font-semibold tracking-tight">
              Curealo
            </span>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="text-sm font-medium">{col.heading}</h4>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {"authMode" in link ? (
                      <AuthTrigger mode={link.authMode} className={LINK_CLASS}>
                        {link.label}
                      </AuthTrigger>
                    ) : (
                      <Link href={link.href} className={LINK_CLASS}>
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-12 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} Curealo. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
