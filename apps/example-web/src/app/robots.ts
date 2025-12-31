import type { MetadataRoute } from "next";

import { env } from "~/env";
import { allItems, langMap } from "./sitemap";

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    env.NODE_ENV === "production"
      ? env.NEXT_PUBLIC_PROJECT_HOME_URL
      : "http://localhost:3000";
  const languages = Object.keys(langMap);
  const sitemapTypes = allItems;
  // Generate all sitemap URLs for each language and type
  const sitemapUrls: string[] = [];
  languages.forEach((lang) => {
    sitemapTypes.forEach((type) => {
      sitemapUrls.push(
        `${baseUrl}/sitemap/${lang}${type === "general" ? "" : `-${type}`}.xml`,
      );
    });
  });
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: sitemapUrls,
  };
}
