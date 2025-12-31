"use client";

import { useEffect } from "react";
import { signal } from "@preact/signals-react";
import DisableDevtool from "disable-devtool";

import { env } from "~/env";
import { usePathname } from "~/i18n/navigation";

// import NavbarRootLayoutComponent from "./_components/_navbar";

export const SIGNAL_CURRENCY = signal<"EUR" | "USD" | "TRY">("EUR");

// Helper function to get cookie value from browser
const getCookie = (name: string): string | undefined => {
  if (typeof document === "undefined") return undefined;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) {
    return parts.pop()?.split(";").shift();
  }
  return undefined;
};

const RootLayoutProviders = ({ children }: { children: React.ReactNode }) => {
  useEffect(() => {
    // Tarayıcıdan cookie'yi oku
    const currencyFromCookie = getCookie("x-currency") as
      | "EUR"
      | "USD"
      | "TRY"
      | undefined;

    SIGNAL_CURRENCY.value = currencyFromCookie ?? "EUR";

    if (env.NODE_ENV === "production") {
      DisableDevtool({
        md5: "900150983cd24fb0d6963f7d28e17f72",
      });
    }
  }, []);

  const pathname = usePathname();

  if (!pathname.startsWith("/profile")) {
    // return <NavbarRootLayoutComponent>{children}</NavbarRootLayoutComponent>;
  }
  return <>{children}</>;
};

export default RootLayoutProviders;
