import type { Formats } from "next-intl";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  // Typically corresponds to the `[locale]` segment
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  const messages$ = (await import(`../../messages/${locale}.ts`)) as {
    default: Record<string, string>;
  };
  const messages = messages$.default;

  return {
    locale,
    messages,
  };
});

export const formats = {} satisfies Formats;
