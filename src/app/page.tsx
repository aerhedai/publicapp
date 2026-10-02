import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { LandingNav } from "@/components/landing/nav";
import { Hero } from "@/components/landing/hero";
import { ScrollShowcase } from "@/components/landing/scroll-showcase";
import { Pricing } from "@/components/landing/pricing";
import { Capabilities } from "@/components/landing/capabilities";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";

export default async function Home() {
  const { userId } = await auth();
  if (userId) {
    redirect("/console");
  }

  return (
    <main className="flex flex-1 flex-col">
      <LandingNav />
      <Hero />
      <ScrollShowcase />
      <div id="pricing">
        <Pricing />
      </div>
      <div id="capabilities">
        <Capabilities />
      </div>
      <FAQ />
      <Footer />
    </main>
  );
}
