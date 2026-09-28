import Link from "next/link";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Pricing", href: "/#pricing" },
      { label: "Capabilities", href: "/#capabilities" },
      { label: "Sign up", href: "/sign-up" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Log in", href: "/sign-in" },
      { label: "Console", href: "/console" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms of Service", href: "/terms" },
      { label: "Privacy Policy", href: "/privacy" },
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
              VidGen
            </span>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <h4 className="text-sm font-medium">{col.heading}</h4>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-12 text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} VidGen. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
