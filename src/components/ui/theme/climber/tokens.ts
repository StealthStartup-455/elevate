// Design tokens for the climber app (/me): the single source for its colors, sizes, radii and
// type. The desk keeps the "granite" tokens in ../tokens.ts; climbers use their phones, so this
// set is bigger, rounder and friendlier. Change a value here, never in a component.
// See STYLE_GUIDE.md, "Climber app".

import type { ColorScheme, RoleColor, StatusColor } from "../tokens";

// ---------------------------------------------------------------------------
// Color. Light grey ground, white cards, one brand teal for actions and the current tab.
//   action (teal):   buttons that do something, the selected tab, meters
//   ok / warn / bad: state only (open, signed up, closed, full), always with an icon
//   inverse:         the one dark card for announcements (an event coming up)
//   highlight:       the amber tag on an announcement
//   heat:            five shades, quiet to busy, for the busy-times bars
// ---------------------------------------------------------------------------

export interface ClimberColors {
  page: string; // behind cards
  surface: string; // cards, the tab bar, fields
  subtle: string; // quiet buttons, segmented track, disabled fills
  line: string; // dividers inside cards
  text: string;
  muted: string; // supporting text: dates, descriptions
  disabled: string; // disabled text only
  hover: string; // translucent hover overlay
  action: RoleColor;
  ok: StatusColor;
  warn: StatusColor;
  bad: StatusColor;
  inverse: { bg: string; text: string; muted: string };
  highlight: { bg: string; text: string };
  heat: [string, string, string, string, string];
  heatNow: string; // the current hour on the busy-times bars
  floatShadow: string; // dialogs and menus only
}

export const climberColors: Record<ColorScheme, ClimberColors> = {
  light: {
    page: "#F3F5F6",
    surface: "#FFFFFF",
    subtle: "#EEF1F3",
    line: "#E3E7EA",
    text: "#111418",
    muted: "#5B6470",
    disabled: "#8C949C",
    hover: "rgb(17 20 24 / 0.05)",
    action: {
      main: "#0A7C72",
      hover: "#08665E",
      pressed: "#065650",
      soft: "#E8F7F4", // teal text on it is 4.6:1
      softHover: "#D3EFEA",
      border: "#A8DCD4",
      on: "#FFFFFF",
    },
    ok: { main: "#1C6B35", soft: "#E3F4E8", on: "#FFFFFF" },
    warn: { main: "#8A5100", soft: "#FFF1D6", on: "#FFFFFF" },
    bad: { main: "#A11D13", soft: "#FDE7E5", on: "#FFFFFF" },
    inverse: { bg: "#111418", text: "#FFFFFF", muted: "#C9CED4" },
    highlight: { bg: "#F2B84B", text: "#111418" },
    heat: ["#CDEDE8", "#9ED9D0", "#5DBFB2", "#1E9B8D", "#0A6C63"],
    heatNow: "#111418",
    floatShadow: "0 12px 32px rgb(17 20 24 / 0.18)",
  },
  dark: {
    page: "#0F1214",
    surface: "#1A1E21",
    subtle: "#252A2E",
    line: "#2E3438",
    text: "#EEF1F3",
    muted: "#A3ABB3",
    disabled: "#6B737B",
    hover: "rgb(238 241 243 / 0.06)",
    action: {
      main: "#4CC3B5",
      hover: "#6ED0C4",
      pressed: "#8ADCD2",
      soft: "#133A36",
      softHover: "#184A45",
      border: "#24625B",
      on: "#062B27",
    },
    ok: { main: "#7AD69A", soft: "#173A23", on: "#0B2414" },
    warn: { main: "#F2C266", soft: "#3D2E0F", on: "#2A1E05" },
    bad: { main: "#FF968C", soft: "#45201D", on: "#2D0D0A" },
    inverse: { bg: "#EEF1F3", text: "#111418", muted: "#4A525C" },
    highlight: { bg: "#F2B84B", text: "#111418" },
    heat: ["#173A36", "#1D5750", "#24806F", "#3AAE9E", "#6ED0C4"],
    heatNow: "#EEF1F3",
    floatShadow: "0 12px 32px rgb(0 0 0 / 0.5)",
  },
};

// ---------------------------------------------------------------------------
// Type. Figtree only (IBM Plex Mono for member codes). The same six style names as the desk,
// so a <Typography variant="body"> reads well in either app, just bigger here.
// ---------------------------------------------------------------------------

export const climberFonts = {
  sans: 'var(--font-figtree), system-ui, -apple-system, "Segoe UI", sans-serif',
  mono: "var(--font-plex-mono), ui-monospace, SFMono-Regular, Consolas, monospace",
} as const;

export interface ClimberTextStyle {
  size: number; // px
  lineHeight: number;
  weight: number;
  tracking?: string; // letter spacing
  muted?: boolean;
}

export const climberText = {
  pageTitle: { size: 28, lineHeight: 1.15, weight: 800, tracking: "-0.02em" }, // one per tab
  cardTitle: { size: 20, lineHeight: 1.25, weight: 800, tracking: "-0.01em" }, // card headings
  kpi: { size: 40, lineHeight: 1, weight: 800, tracking: "-0.02em" }, // "Moderate", big numbers
  body: { size: 17, lineHeight: 1.45, weight: 400 }, // everything people read
  secondary: { size: 15, lineHeight: 1.4, weight: 400, muted: true }, // dates, descriptions
  label: { size: 13, lineHeight: 1.3, weight: 700 }, // tab labels, tags, chart axes
} as const satisfies Record<string, ClimberTextStyle>;

// ---------------------------------------------------------------------------
// Space and shape. Still the 4px grid (sx={{ p: 5 }} is 20px), with roomier defaults.
// ---------------------------------------------------------------------------

export const climberSpace = {
  page: 20, // side margin of a tab
  cardGap: 16, // between cards
  cardPadding: 20, // inside cards
  stack: 12, // between items inside a card
} as const;

// Every tap target is at least 44px (Apple's and Google's minimum); buttons are 48px.
export const climberControl = { min: 44, md: 48, lg: 56 } as const;

export const climberRadius = {
  sm: 8, // bars, small tiles
  md: 14, // buttons, fields, segmented controls
  lg: 20, // cards
  xl: 24, // the plan card, the QR card
  full: 9999, // tags, avatars
} as const;

// The bottom tab bar: 64px of tabs plus the phone's home-indicator inset.
export const tabBar = { height: 64 } as const;
