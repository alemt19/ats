// @ts-check
import { config as baseConfig } from "@repo/eslint-config/base";
import tseslint from "typescript-eslint";

export default [
  ...baseConfig,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname
      }
    }
  }
];
