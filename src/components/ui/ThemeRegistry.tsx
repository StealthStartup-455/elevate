"use client";

import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { createTheme, ThemeProvider } from "@mui/material/styles";

// Material UI theme. Follows the system light/dark setting like globals.css.
// Primary is the green from the customer dashboard mock, until the style guide lands.
const theme = createTheme({
  cssVariables: true,
  colorSchemes: {
    light: { palette: { primary: { main: "#24705c" } } },
    dark: { palette: { primary: { main: "#5fb59b" } } },
  },
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
