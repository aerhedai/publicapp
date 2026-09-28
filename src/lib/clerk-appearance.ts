// Passed once to <ClerkProvider> in src/app/layout.tsx, which cascades it
// to every Clerk component (SignIn, SignUp, UserButton, etc.) - no need to
// repeat this per-page.
//
// Every color-bearing class below uses Tailwind's "!" important modifier.
// This isn't optional styling preference - confirmed live via
// getComputedStyle() that Clerk's own injected styles win the cascade over
// a plain (non-important) Tailwind utility passed through `elements`,
// regardless of what the `variables` block above says. Without "!", text
// silently renders in Clerk's default near-black (rgb(33,33,38)) against
// this app's dark background - unreadable, not just "not quite right".
//
// The "card" element gets a real, opaque background here (not transparent)
// - it reads as its own distinct surface inside AuthCard's right column
// (src/components/auth/auth-card.tsx), not a seamless blend into it.
//
// Deliberately untyped here (rather than guessing at Clerk's internal
// export path for the appearance type) - TypeScript still structurally
// checks this object's shape at the <ClerkProvider appearance={...}> call
// site in layout.tsx, which is what actually matters.
export const clerkAppearance = {
  variables: {
    colorPrimary: "#6366f1",
    colorBackground: "#141414",
    colorText: "#fafafa",
    colorTextSecondary: "#a1a1aa",
    colorInputBackground: "#0a0a0a",
    colorInputText: "#fafafa",
    colorNeutral: "#fafafa",
    borderRadius: "0.75rem",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  elements: {
    card: "!bg-[#141414] !border !border-white/10 !shadow-none !rounded-2xl !p-6",
    header: "!text-white",
    headerTitle: "!text-white text-xl font-semibold font-[family-name:var(--font-bricolage)]",
    headerSubtitle: "!text-zinc-400 text-sm",

    socialButtonsBlockButton: "!border-white/15 !bg-white/5 hover:!bg-white/10",
    socialButtonsBlockButtonText: "!text-white",

    dividerRow: "!text-zinc-500",
    dividerText: "!text-zinc-500",
    dividerLine: "!bg-white/10",

    formFieldLabel: "!text-zinc-300",
    formFieldLabelRow: "!text-zinc-300",
    formFieldInput:
      "!bg-white/5 !border-white/15 !text-white placeholder:!text-zinc-500 focus:!border-white/30 focus:!ring-white/20",
    formFieldHintText: "!text-zinc-500",
    formFieldErrorText: "!text-red-400",
    formFieldSuccessText: "!text-emerald-400",
    formFieldAction: "!text-white",
    formButtonPrimary: "!text-white text-sm normal-case font-medium hover:!opacity-90",
    formResendCodeLink: "!text-white",
    otpCodeFieldInput: "!text-white !border-white/15 !bg-white/5",

    identityPreviewText: "!text-white",
    identityPreviewEditButton: "!text-zinc-400",
    identityPreviewEditButtonIcon: "!text-zinc-400",

    badge: "!text-zinc-400 !bg-white/5",
    lastAuthenticationStrategyBadge: "!text-zinc-300 !bg-white/10",
    alertText: "!text-red-400",

    footer: "!bg-transparent",
    footerItem: "!text-zinc-500",
    footerActionText: "!text-zinc-400",
    // footerAction itself is hidden - src/components/auth/auth-card.tsx
    // renders its own "switch mode" link that swaps the modal's mode
    // client-side instead of a full page navigation, which Clerk's default
    // footer link doesn't support out of the box.
    footerAction: "!hidden",
  },
};
