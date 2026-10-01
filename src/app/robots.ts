import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/console", "/api"],
      },
    ],
    sitemap: `${process.env.APP_BASE_URL ?? "https://aerhed.com"}/sitemap.xml`,
  };
}
