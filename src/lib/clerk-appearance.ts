// Passed once to <ClerkProvider> in src/app/layout.tsx, which cascades it
// to every Clerk component (SignIn, SignUp, UserButton, etc.) - no need to
// repeat this per-page. Edit the values below to match your actual brand
// once you have one; these are just a clean, non-default starting point.
// Deliberately untyped here (rather than guessing at Clerk's internal
// export path for the appearance type) - TypeScript still structurally
// checks this object's shape at the <ClerkProvider appearance={...}> call
// site in layout.tsx, which is what actually matters.
export const clerkAppearance = {
  variables: {
    colorPrimary: "#171717",
    colorBackground: "#ffffff",
    colorText: "#171717",
    colorTextSecondary: "#6b7280",
    colorInputBackground: "#ffffff",
    colorInputText: "#171717",
    borderRadius: "0.5rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    card: "shadow-md border border-neutral-200",
    headerTitle: "text-xl font-semibold",
    headerSubtitle: "text-sm text-neutral-500",
    formButtonPrimary:
      "bg-neutral-900 hover:bg-neutral-700 text-sm normal-case font-medium",
    formFieldInput: "border-neutral-300 focus:border-neutral-900 focus:ring-neutral-900",
    footerActionLink: "text-neutral-900 hover:text-neutral-700 font-medium",
    socialButtonsBlockButton: "border-neutral-300 hover:bg-neutral-50",
    dividerLine: "bg-neutral-200",
    dividerText: "text-neutral-400",
  },
};
