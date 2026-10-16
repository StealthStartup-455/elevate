// TypeScript additions for the MUI theme in theme.ts. See STYLE_GUIDE.md.
import "@mui/material/styles";
import "@mui/material/Typography";
import type { CSSProperties } from "react";

declare module "@mui/material/styles" {
  // CSS variables are always on, so theme.vars is always defined.
  interface CssThemeVariables {
    enabled: true;
  }

  // Tinted backgrounds and borders for primary (actions), secondary (navigation) and status colors.
  interface PaletteColor {
    soft: string;
    softHover: string;
    border: string;
    pressed: string;
  }
  interface SimplePaletteColorOptions {
    soft?: string;
    softHover?: string;
    border?: string;
    pressed?: string;
  }

  interface TypeBackground {
    subtle: string;
  }

  interface Palette {
    sidebar: { bg: string; text: string; muted: string; active: string; activeText: string; mark: string };
    chart: { data: string; now: string };
    floatShadow: string;
  }
  interface PaletteOptions {
    sidebar?: Palette["sidebar"];
    chart?: Palette["chart"];
    floatShadow?: string;
  }

  // The six text styles. MUI's built-in variants still exist for MUI's own components and older
  // screens; new code uses these.
  interface TypographyVariants {
    pageTitle: CSSProperties;
    cardTitle: CSSProperties;
    kpi: CSSProperties;
    body: CSSProperties;
    secondary: CSSProperties;
    label: CSSProperties;
  }
  interface TypographyVariantsOptions {
    pageTitle?: CSSProperties;
    cardTitle?: CSSProperties;
    kpi?: CSSProperties;
    body?: CSSProperties;
    secondary?: CSSProperties;
    label?: CSSProperties;
  }
}

declare module "@mui/material/Typography" {
  interface TypographyPropsVariantOverrides {
    pageTitle: true;
    cardTitle: true;
    kpi: true;
    body: true;
    secondary: true;
    label: true;
  }
}
