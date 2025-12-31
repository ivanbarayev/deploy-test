import type { AppConfigNextIntl } from "_appconfig";
import type { MetadataRoute } from "next";

import { env } from "~/env";
import { routing } from "~/i18n/routing";

interface SitemapEntry {
  url: string;
  date: string;
  alternates: Record<string, string>;
}

interface SitemapParams {
  entries: SitemapEntry[];
  languages: Record<string, string>;
}

function buildSitemap({ entries }: SitemapParams): MetadataRoute.Sitemap {
  return entries.map(({ url, date, alternates }) => ({
    url,
    lastModified: new Date(date).toISOString().slice(0, 16) + ":00+00:00",
    alternates: { languages: alternates },
  }));
}

export function generateSitemaps() {
  return [{ id: "en" }, { id: "fr" }] satisfies {
    id: AppConfigNextIntl["Locales"][number];
  }[];
}

// Language mapping
const defaultLang = routing.defaultLocale;
export const langMap: Record<AppConfigNextIntl["Locales"][number], string> = {
  en: "",
  fr: "fr",
};
// Define URLs
const allItemsGeneral = "general";
// const allItemsGames = "games";
export const allItems = [allItemsGeneral /*, allItemsGames*/];
// Define items
const generalItems = [
  { path: { en: "", fr: "" }, date: "2025-12-04T05:30:00+03:00" },
  { path: { en: "profile", fr: "profil" }, date: "2025-12-04T10:00:00+03:00" },
] as const satisfies {
  path: Record<AppConfigNextIntl["Locales"][number], string>;
  date: string;
}[];

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;
  const siteUrl =
    env.NODE_ENV === "production"
      ? env.NEXT_PUBLIC_PROJECT_HOME_URL
      : "http://localhost:3000";
  // Parse id
  const [langRaw, typeRaw] =
    typeof id === "string"
      ? id.length === 0
        ? ["", ""]
        : id.split("-")
      : [defaultLang, allItemsGeneral];
  const lang: AppConfigNextIntl["Locales"][number] =
    typeof langRaw === "string" &&
    Object.prototype.hasOwnProperty.call(langMap, langRaw)
      ? (langRaw as AppConfigNextIntl["Locales"][number])
      : defaultLang;
  const type = typeof typeRaw === "string" ? typeRaw : allItemsGeneral;
  interface ItemType {
    path: Record<AppConfigNextIntl["Locales"][number], string>;
    date: string;
  }
  let items: ItemType[] = [];
  if (type === allItemsGeneral) {
    items = generalItems;
  } /*else if (type === allItemsGames) {
    items = gamesItems;
  }*/ else if (
    !allItems.includes(type) ||
    !Object.keys(langMap).includes(lang)
  ) {
    // Unknown id: show everything for all languages
    items = [...generalItems /*, ...gamesItems*/];
  }

  const entries: SitemapEntry[] = [];
  // Known id: fetch entries for the selected locale only
  const prefix = langMap[lang];
  items.forEach((item) => {
    const itemPath = item.path[lang];
    const url =
      prefix === ""
        ? itemPath === ""
          ? `${siteUrl}/`
          : `${siteUrl}/${itemPath}`
        : itemPath === ""
          ? `${siteUrl}/${prefix}`
          : `${siteUrl}/${prefix}/${itemPath}`;
    // Alternates
    let alternates: Record<string, string> = {};
    Object.entries(langMap).forEach(([_altLang, altPrefix]) => {
      const altLang = _altLang as AppConfigNextIntl["Locales"][number];
      const altPath = item.path[altLang];
      alternates[altLang] =
        altPrefix === ""
          ? altPath === ""
            ? `${siteUrl}/`
            : `${siteUrl}/${altPath}`
          : altPath === ""
            ? `${siteUrl}/${altPrefix}`
            : `${siteUrl}/${altPrefix}/${altPath}`;
    });
    if (alternates[defaultLang]) {
      alternates["x-default"] = alternates[defaultLang];
      const tempAlternates = { "x-default": alternates[defaultLang] };
      Object.assign(tempAlternates, alternates);
      alternates = tempAlternates;
    }
    entries.push({ url, date: item.date, alternates });
  });
  return buildSitemap({ entries, languages: {} });
}
