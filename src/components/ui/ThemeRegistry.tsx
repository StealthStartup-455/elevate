"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import { theme } from "./theme/theme";

// Material UI theme from the style guide (STYLE_GUIDE.md, src/components/ui/theme/).
// Follows the system light/dark setting until the user picks one (see ColorModeToggle).
export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  // enableCssLayer puts MUI styles in `@layer mui` so Tailwind utilities still win.
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme} disableTransitionOnChange>
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
