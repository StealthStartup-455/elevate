"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { createTheme, ThemeProvider } from "@mui/material/styles";

// Material UI theme. Follows the system light/dark setting like globals.css.
const theme = createTheme({
  cssVariables: true,
  colorSchemes: { light: true, dark: true },
  typography: { fontFamily: "var(--font-geist-sans), Arial, sans-serif" },
});

export default function ThemeRegistry({ children }: { children: React.ReactNode }) {
  // enableCssLayer puts MUI styles in `@layer mui` so Tailwind utilities still win.
  return (
    <AppRouterCacheProvider options={{ enableCssLayer: true }}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </AppRouterCacheProvider>
  );
}
