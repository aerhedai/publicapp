import type { MetadataRoute } from "next";

// Only the real, public, unauthenticated marketing routes - /console/* is
// behind auth and has nothing for a crawler to index.
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.APP_BASE_URL ?? "https://curealo.com";
  return [
    { url: base, changeFrequency: "weekly", priority: 1 },
  ];
}
