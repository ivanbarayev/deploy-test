import { defineConfig } from "eslint/config";

import { baseConfig, restrictEnvAccess } from "@projectfe/eslint-config/base";
import { nextjsConfig } from "@projectfe/eslint-config/nextjs";
import { reactConfig } from "@projectfe/eslint-config/react";

export default defineConfig(
  {
    ignores: [".next/**"],
  },
  baseConfig,
  reactConfig,
  nextjsConfig,
  restrictEnvAccess,
);
