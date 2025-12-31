import { defineRouting } from "next-intl/routing";

export const ROUTING_LOCALES = ["en", "fr"] as const;
export const ROUTING_DEFAULT_LOCALE = "en" as const;

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ROUTING_LOCALES,

  // Used when no locale matches
  defaultLocale: ROUTING_DEFAULT_LOCALE,

  // The `pathnames` object holds pairs of internal and
  // external paths. Based on the locale, the external
  // paths are rewritten to the shared, internal ones.
  pathnames: {
    // If all locales use the same pathname, a single
    // external path can be used for all locales
    "/": "/",
    "/profile": {
      en: "/profile",
      fr: "/profil",
    },
  },
});
