// Design tokens: the single source for every color, size, radius and timing in the app.
// The MUI theme (theme.ts) and Tailwind (src/app/globals.css) both read from here, through
// MUI's CSS variables. Change a value here, never in a component. See STYLE_GUIDE.md.

// ---------------------------------------------------------------------------
// Color. "Granite" palette: near-greyscale structure, color only where it means something.
//   action (teal):      things that do something (check in, save, buy, send)
//   nav (slate blue):   things that move you around or change the view (links, filters, tabs)
//   ok / warn / bad:    state only (valid, expiring, failed), always with an icon
// ---------------------------------------------------------------------------

export type ColorScheme = "light" | "dark";

export interface RoleColor {
  main: string; // filled backgrounds, text on cards
  hover: string; // filled background on hover
  pressed: string; // filled background while pressed
  soft: string; // tinted backgrounds (secondary buttons, segmented-control track)
  softHover: string; // tinted background on hover
  border: string; // border of tinted buttons
  on: string; // text on a filled `main` background
}

export interface StatusColor {
  main: string; // text and icon
  soft: string; // pill background
  on: string; // text on a filled `main` background (rare)
}

export interface SchemeColors {
  page: string; // app background behind cards
  surface: string; // cards, tables, inputs
  subtle: string; // hover fill, table headers, segmented tracks
  line: string; // 1px borders and dividers
  text: string; // primary text: what people came to read
  muted: string; // secondary text: timestamps, descriptions, units
  disabled: string; // disabled text only (the one text color allowed below 4.5:1)
  hover: string; // translucent hover overlay for rows and icon buttons
  selected: string; // translucent selected overlay
  action: RoleColor;
  nav: RoleColor;
  ok: StatusColor;
  warn: StatusColor;
  bad: StatusColor;
  sidebar: { bg: string; text: string; muted: string; active: string; activeText: string; mark: string };
  chart: { data: string; now: string };
  floatShadow: string; // tooltips, menus, dialogs. Nothing else gets a shadow.
}

export const colors: Record<ColorScheme, SchemeColors> = {
  light: {
    page: "#EDEFF1",
    surface: "#FFFFFF",
    subtle: "#F3F5F6",
    line: "#DBDEE1",
    text: "#1F2326",
    muted: "#5C6166",
    disabled: "#8A9095",
    hover: "rgb(31 35 38 / 0.05)",
    selected: "rgb(38 66 108 / 0.08)",
    action: {
      main: "#00615F",
      hover: "#005250",
      pressed: "#004341",
      soft: "#E0F5F4",
      softHover: "#CDEEEC",
      border: "#9DC7C5",
      on: "#FFFFFF",
    },
    nav: {
      main: "#26426C",
      hover: "#1B355B",
      pressed: "#152B4B",
      soft: "#EAF1FB",
      softHover: "#DAE7FB",
      border: "#B4C6E0",
      on: "#FFFFFF",
    },
    ok: { main: "#397247", soft: "#E3F6E6", on: "#FFFFFF" },
    warn: { main: "#955D27", soft: "#FCF0D7", on: "#FFFFFF" },
    bad: { main: "#A04038", soft: "#FFE8E8", on: "#FFFFFF" },
    sidebar: {
      bg: "#2D3236",
      text: "#EAEDEF",
      muted: "#AFB5BA",
      active: "#3F4F67",
      activeText: "#FFFFFF",
      mark: "#BCC6CD",
    },
    chart: { data: "#7A8187", now: "#30363B" },
    floatShadow: "0 6px 18px rgb(20 24 28 / 0.18)",
  },
  dark: {
    page: "#15181A",
    surface: "#1C2022",
    subtle: "#24272A",
    line: "#313538",
    text: "#E5E8EA",
    muted: "#9FA6AA",
    disabled: "#646B70",
    hover: "rgb(229 232 234 / 0.06)",
    selected: "rgb(170 198 239 / 0.12)",
    action: {
      main: "#64BCB9",
      hover: "#82CECA",
      pressed: "#9CDCD9",
      soft: "#163432",
      softHover: "#173F3E",
      border: "#34615F",
      on: "#0D1B1B",
    },
    nav: {
      main: "#AAC6EF",
      hover: "#BED6F9",
      pressed: "#CCDFFB",
      soft: "#242E3E",
      softHover: "#29394F",
      border: "#3D4D66",
      on: "#141B26",
    },
    ok: { main: "#88CA95", soft: "#1F3423", on: "#15181A" },
    warn: { main: "#E6BD77", soft: "#3C2D18", on: "#15181A" },
    bad: { main: "#E6857E", soft: "#442321", on: "#15181A" },
    sidebar: {
      bg: "#0D1012",
      text: "#DEE2E4",
      muted: "#93999E",
      active: "#27364C",
      activeText: "#FFFFFF",
      mark: "#AFB9C0",
    },
    chart: { data: "#7A8187", now: "#D9DFE3" },
    floatShadow: "0 6px 18px rgb(0 0 0 / 0.5)",
  },
};

// ---------------------------------------------------------------------------
// Type. Two typefaces (IBM Plex Sans for everything, condensed for headers) plus
// IBM Plex Mono for codes and IDs. Six text styles and no others.
// ---------------------------------------------------------------------------

export const fonts = {
  sans: 'var(--font-plex-sans), system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: "var(--font-plex-mono), ui-monospace, SFMono-Regular, Consolas, monospace",
  // Headers use IBM Plex Sans's width axis at 85%, which is IBM Plex Sans Condensed.
  headStretch: "85%",
} as const;

export interface TextStyle {
  size: number; // px
  lineHeight: number; // unitless
  weight: number;
  head?: boolean; // uses the condensed header face
  muted?: boolean; // secondary text color
  uppercase?: boolean;
}

export const textStyles = {
  pageTitle: { size: 20, lineHeight: 1.2, weight: 700, head: true },
  cardTitle: { size: 14, lineHeight: 1.3, weight: 600, head: true },
  kpi: { size: 24, lineHeight: 1.1, weight: 600, head: true },
  body: { size: 13, lineHeight: 1.5, weight: 400 },
  secondary: { size: 12, lineHeight: 1.4, weight: 400, muted: true },
  label: { size: 11, lineHeight: 1.3, weight: 600, muted: true, uppercase: true },
} as const satisfies Record<string, TextStyle>;

export type TextStyleName = keyof typeof textStyles;

// ---------------------------------------------------------------------------
// Spacing and sizing ("Crimp" density). Everything is a multiple of 4px.
// MUI spacing(1) and Tailwind's p-1 are both 4px, so sx={{ p: 3 }} === className="p-3".
// ---------------------------------------------------------------------------

export const spacingUnit = 4;

export const space = {
  page: 16, // page margin (p-4)
  cardGap: 12, // gap between cards (gap-3)
  cardPadding: 12, // padding inside cards (p-3)
  stack: 8, // gap between items inside a card (gap-2)
  rowY: 6, // table cell padding, top and bottom
  controlX: 10, // horizontal padding inside buttons and fields
} as const;

// Control heights. Staff screens use sm and md. lg is for touch: every control grows to lg
// on touch screens automatically (see theme.ts), and member pages may ask for it directly.
export const controlHeight = { sm: 24, md: 28, lg: 40 } as const;

export const layout = {
  sidebarWidth: 196,
  narrow: 560, // single-column pages: forms, member dashboard
} as const;

// ---------------------------------------------------------------------------
// Shape. Three radii plus fully round. A shape inside another uses the outer radius minus
// the gap between them.
// ---------------------------------------------------------------------------

export const radius = {
  sm: 2, // tags, tooltips, chart bars
  md: 4, // buttons, fields, chips, menus
  lg: 6, // cards and tiles
  full: 9999, // status pills, avatars, help icons
} as const;

// ---------------------------------------------------------------------------
// Motion
// ---------------------------------------------------------------------------

export const motion = {
  duration: 120, // ms, every hover and state change
  easing: "cubic-bezier(0.2, 0, 0, 1)",
  tooltipDelay: 250, // ms before a tooltip appears
} as const;

export const px = (value: number) => `${value / 16}rem`;
