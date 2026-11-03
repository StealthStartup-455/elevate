"use client";

import Box from "@mui/material/Box";
import { ThemeProvider } from "@mui/material/styles";
import { climberTheme } from "@/components/ui/theme/climber/theme";

// Switches everything inside it to the climber app's look (STYLE_GUIDE.md, "Climber app"):
// the climber MUI theme, its Figtree type and its grey ground. Light and dark follow the same
// setting as the desk. Tailwind's color classes (bg-surface, border-line) still mean the desk's
// colors, so climber screens take color from MUI (sx, palette props) only.
export default function ClimberTheme({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={climberTheme} disableTransitionOnChange>
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          bgcolor: "background.default",
          color: "text.primary",
          fontFamily: "fontFamily",
          fontSize: "1.0625rem",
          lineHeight: 1.45,
        }}
      >
        {children}
      </Box>
    </ThemeProvider>
  );
}
