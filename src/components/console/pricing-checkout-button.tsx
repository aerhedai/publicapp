"use client";

import { useState } from "react";
import type { PricingTier } from "@/lib/pricing-tiers";

export function PricingCheckoutButton({ tier, popular }: { tier: PricingTier; popular: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierId: tier.id }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't start checkout");
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        type="button"
        disabled={loading}
        onClick={() => void handleClick()}
        className={`w-full rounded-full px-5 py-2.5 text-center text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50 ${
          popular ? "bg-foreground text-background" : "border border-border text-foreground"
        }`}
      >
        {loading ? "Redirecting..." : "Buy credits"}
      </button>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
