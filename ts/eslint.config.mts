import eslint from "@eslint/js";
import tseslint from "typescript-eslint";

// https://typescript-eslint.io/packages/typescript-eslint/
export default tseslint.config(
  eslint.configs.recommended,
  tseslint.configs.strictTypeChecked,
  tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: process.cwd(),
      },
    },
  },
  {
    ignores: ["build/", "dist/"],
  },
  {
    rules: {
      "no-debugger": "off", // Disable the no-debugger rule
    },
  }
);
