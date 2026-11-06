import localFont from "next/font/local";

// Fonts are bundled with the app (font-files/, SIL Open Font License) instead of fetched from
// Google at build time, so builds work offline and in CI, and the hosted app makes no
// third-party font requests.
//
// IBM Plex Sans is a variable font with a width axis: headers use it at 85% (IBM Plex Sans
// Condensed), so one file covers both faces. Plex Mono is for codes, IDs and usernames only.
// Latin subset only, matching the previous `subsets: ["latin"]`.
export const plexSans = localFont({
  src: "./font-files/ibm-plex-sans-latin-wdth-wght.woff2",
  weight: "100 700",
  style: "normal",
  variable: "--font-plex-sans",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "75% 100%" }],
});

// Figtree is the climber app's face (climber/tokens.ts): rounder and easier to read on a phone.
// Variable weight, latin subset, from Fontsource (SIL Open Font License, OFL-figtree.txt).
export const figtree = localFont({
  src: "./font-files/figtree-latin-wght-normal.woff2",
  weight: "300 900",
  style: "normal",
  variable: "--font-figtree",
  display: "swap",
});

export const plexMono = localFont({
  src: [
    { path: "./font-files/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./font-files/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-plex-mono",
  display: "swap",
});
