// Passed once to <ClerkProvider> in src/app/layout.tsx, which cascades it
// to every Clerk component (SignIn, SignUp, UserButton, etc.) - no need to
// repeat this per-page. Matches the app's dark theme (see globals.css) -
// the "card" element is made transparent/borderless here because Clerk's
// form always renders inside our own AuthCard's right column
// (src/components/auth/auth-card.tsx), which already provides the
// surface/border/padding - a second nested card would double up.
// Deliberately untyped here (rather than guessing at Clerk's internal
// export path for the appearance type) - TypeScript still structurally
// checks this object's shape at the <ClerkProvider appearance={...}> call
// site in layout.tsx, which is what actually matters.
export const clerkAppearance = {
  variables: {
    colorPrimary: "#6366f1",
    colorBackground: "transparent",
    colorText: "#fafafa",
    colorTextSecondary: "#a1a1aa",
    colorInputBackground: "#0a0a0a",
    colorInputText: "#fafafa",
    colorNeutral: "#fafafa",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    card: "shadow-none border-none bg-transparent",
    headerTitle: "text-xl font-semibold font-[family-name:var(--font-bricolage)]",
    headerSubtitle: "text-sm text-zinc-400",
    formButtonPrimary: "text-sm normal-case font-medium hover:opacity-90",
    formFieldInput: "border-white/10 bg-white/5 focus:border-white/30 focus:ring-white/20",
    footerActionLink: "text-white hover:text-white/70 font-medium",
    socialButtonsBlockButton: "border-white/10 hover:bg-white/5",
    dividerLine: "bg-white/10",
    dividerText: "text-zinc-500",
    footer: "bg-transparent",
    // Hidden - src/components/auth/auth-card.tsx renders its own
    // "switch mode" link that swaps the modal's mode client-side instead
    // of a full page navigation, which Clerk's default footer link doesn't
    // support out of the box. Needs the !important modifier - confirmed
    // live that plain "hidden" loses the cascade to Clerk's own
    // higher-specificity injected styles (computed display stayed "flex"
    // despite the "hidden" class being present in the DOM).
    footerAction: "!hidden",
  },
};
