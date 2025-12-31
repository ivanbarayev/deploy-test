import { defineConfig } from "eslint/config";

import { baseConfig } from "@projectfe/eslint-config/base";
import { reactConfig } from "@projectfe/eslint-config/react";

export default defineConfig(
  {
    ignores: ["dist/**"],
  },
  baseConfig,
  reactConfig,
);
