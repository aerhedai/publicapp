import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { AuthModalProvider } from "@/components/auth/auth-modal-context";
import { AuthModal } from "@/components/auth/auth-modal";
import { CookieBanner } from "@/components/cookie-banner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Headline/display font - deliberately not Geist for this role. Geist is
// instantly recognizable as "the Vercel/shadcn default"; bold marketing
// headlines in it read as templated. Bricolage Grotesque is bold and
// distinctive without needing a self-hosted font (see globals.css's
// --font-display token).
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const APP_URL = process.env.APP_BASE_URL ?? "https://curealo.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: "Curealo",
  description: "Turn a prompt into a scene.",
  openGraph: {
    title: "Curealo",
    description: "Turn a prompt into a scene.",
    url: APP_URL,
    siteName: "Curealo",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Curealo",
    description: "Turn a prompt into a scene.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html
        lang="en"
        className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full antialiased dark`}
      >
        <body className="min-h-full flex flex-col">
          <AuthModalProvider>
            {children}
            <AuthModal />
          </AuthModalProvider>
          <CookieBanner />
        </body>
      </html>
    </ClerkProvider>
  );
}
