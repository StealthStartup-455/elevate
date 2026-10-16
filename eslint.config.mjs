import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Style guide rules (STYLE_GUIDE.md). Every color, size and radius comes from
// src/components/ui/theme/tokens.ts, so raw values outside that folder are errors.
const rawColor = "#[0-9a-fA-F]{3,8}\\b|\\b(?:rgba?|hsla?|oklch)\\(";
const arbitraryValue = "(?:^|\\s)[\\w:-]*-\\[";
const offSystemClass =
  "(?:^|[\\s:])(?:text-(?:xs|sm|base|lg|\\d?xl)|font-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)" +
  "|(?:bg|text|border|ring|outline|fill|stroke|divide|from|via|to|shadow|decoration|accent|caret|placeholder)-" +
  "(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)\\b)";

const colorMessage =
  "Raw colors are not allowed. Use a theme color: sx={{ color: 'text.secondary' }}, a palette prop like color=\"secondary\", or a Tailwind token like text-fg-muted. See STYLE_GUIDE.md (Color).";
const arbitraryMessage =
  "Tailwind arbitrary values like p-[13px] bypass the spacing scale. Use a scale class (p-3 = 12px) or add a token in globals.css. See STYLE_GUIDE.md (Spacing).";
const classMessage =
  "Tailwind text sizes, font weights and palette colors are off-system. Use <Typography variant=\"...\"> for text and token classes (bg-surface, text-fg-muted, border-line) for color. See STYLE_GUIDE.md.";

const styleGuide = {
  files: ["src/**/*.{ts,tsx}"],
  ignores: ["src/components/ui/theme/**", "src/generated/**"],
  rules: {
    "no-restricted-syntax": [
      "error",
      { selector: `Literal[value=/${rawColor}/]`, message: colorMessage },
      { selector: `TemplateElement[value.raw=/${rawColor}/]`, message: colorMessage },
      { selector: `JSXAttribute[name.name='className'] Literal[value=/${arbitraryValue}/]`, message: arbitraryMessage },
      { selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=/${arbitraryValue}/]`, message: arbitraryMessage },
      { selector: `JSXAttribute[name.name='className'] Literal[value=/${offSystemClass}/]`, message: classMessage },
      { selector: `JSXAttribute[name.name='className'] TemplateElement[value.raw=/${offSystemClass}/]`, message: classMessage },
    ],
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  styleGuide,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
