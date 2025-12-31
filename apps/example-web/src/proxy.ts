import type { AppConfigNextIntl } from "_appconfig";
import type { NextFetchEvent, NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import LinkHeader from "http-link-header";
import createMiddleware from "next-intl/middleware";

import { routing } from "./i18n/routing";

const isProtectedRoute = createRouteMatcher(["/:locale?/chat(.*)"]);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|txt|xml|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};

export default async function proxy(
  req: NextRequest,
  res: NextResponse,
  event: NextFetchEvent,
) {
  if (
    // req.method === "POST" &&
    req.url.includes("/api/callbacks/---/3ds")
  ) {
    return NextResponse.next();
  }
  return clerkMiddleware(async (auth, req) => {
    if (isProtectedRoute(req)) await auth.protect();

    if (
      req.url.includes("/api") ||
      req.url.includes("/_vercel") ||
      req.url.includes("/_next")
    ) {
      return NextResponse.next();
    }

    // Step 1: Use the incoming request
    const headerLocale = req.headers.get("x-lang");
    // routing.locales ve routing.defaultLocale kullan
    const availableLocales = [
      ...routing.locales,
    ] as AppConfigNextIntl["Locales"];
    const headerLocaleTyped =
      availableLocales.find((l) => l === headerLocale) ?? undefined;
    const acceptedLocale: AppConfigNextIntl["Locales"][number] =
      headerLocaleTyped ?? routing.defaultLocale;

    // Step 2: Create and call the next-intl middleware
    const handleI18nRouting = createMiddleware({
      locales: availableLocales,
      defaultLocale: acceptedLocale,
      pathnames: routing.pathnames,
      localeCookie: true,
      localePrefix: "as-needed",
    });
    const response = handleI18nRouting(req);

    // Step 3: Alter the response
    response.headers.set("x-lang", acceptedLocale);

    if (!req.cookies.get("x-currency")) {
      // Set default currency if not set
      response.cookies.set("x-currency", "EUR");
    }

    if (response.headers.get("link") && response.headers.get("link") !== null) {
      // Example: Remove the `x-default` entry
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const link = LinkHeader.parse(response.headers.get("link")!);
      // link.refs = link.refs.filter((entry) => entry.hreflang !== 'x-default');
      response.headers.set("link", link.toString());
    }

    return response;
  })(req, event);
}
