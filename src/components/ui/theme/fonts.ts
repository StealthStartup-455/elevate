import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";

// IBM Plex Sans is a variable font with a width axis: headers use it at 85% (IBM Plex Sans
// Condensed), so one file covers both faces. Plex Mono is for codes, IDs and usernames only.
export const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-plex-sans",
  display: "swap",
});

export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-plex-mono",
  display: "swap",
});
