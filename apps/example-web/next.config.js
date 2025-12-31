import { createJiti } from "jiti";
import createNextIntlPlugin from "next-intl/plugin";

const jiti = createJiti(import.meta.url);

// Import env files to validate at build time. Use jiti so we can load .ts files in here.
await jiti.import("./src/env");

/** @type {import("next").NextConfig} */
const config = {
  poweredByHeader: false,

  cacheComponents: true,

  /** Enables hot reloading for local packages without a build step */
  transpilePackages: [
    "@projectfe/core-api",
    "@projectfe/core-db",
    "@projectfe/ui",
    "@projectfe/validators",
  ],
  // turbopack: {},

  /** We already do linting and typechecking as separate tasks in CI */
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [new URL("https://google.com/**")],
    qualities: [75, 100],
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(config);
