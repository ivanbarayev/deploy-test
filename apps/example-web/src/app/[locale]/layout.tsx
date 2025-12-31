import type { Metadata, Viewport } from "next";
import { Oswald, Roboto, Roboto_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import {
  ClerkProvider,
  // SignedIn,
  // SignedOut,
  // SignInButton,
  // SignUpButton,
  // UserButton,
} from "@clerk/nextjs";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { setRequestLocale } from "next-intl/server";

import { cn } from "@projectfe/ui";
import { ThemeProvider /*, ThemeToggle*/ } from "@projectfe/ui/theme";
import { Toaster } from "@projectfe/ui/toast";

import { TRPCReactProvider } from "~/trpc/react";

import "./styles.css";

import muiTheme from "~/theme/mui-theme";
import RootLayoutProviders from "./layout-providers";

export const metadata: Metadata = {};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const robotoSans = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-sans",
});
const robotoMono = Roboto_Mono({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-mono",
});
const oswaldSans = Oswald({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-oswald-sans",
});

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function RootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  // Ensure that the incoming `locale` is valid
  const { locale } = await props.params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }
  // Enable static rendering
  setRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={cn(
          `body body--${locale} body--default`,
          robotoSans.variable,
          robotoMono.variable,
          oswaldSans.variable,
        )}
      >
        <TRPCReactProvider>
          <ClerkProvider>
            <NextIntlClientProvider>
              <ThemeProvider>
                <AppRouterCacheProvider
                  options={{ key: "css-mui", enableCssLayer: true }}
                >
                  <MuiThemeProvider theme={muiTheme}>
                    <RootLayoutProviders>{props.children}</RootLayoutProviders>
                  </MuiThemeProvider>
                </AppRouterCacheProvider>
                <Toaster />
              </ThemeProvider>
            </NextIntlClientProvider>
          </ClerkProvider>
        </TRPCReactProvider>
      </body>
    </html>
  );
}
