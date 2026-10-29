import type { Metadata } from "next";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";
import AppVersion from "@/components/ui/AppVersion";
import ThemeRegistry from "@/components/ui/ThemeRegistry";
import { plexMono, plexSans } from "@/components/ui/theme/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Elevate",
  description: "Front desk and member app for climbing gyms",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: InitColorSchemeScript sets the light/dark attribute on <html>
    // before React hydrates, so the page never flashes the wrong theme.
    <html
      lang="en"
      className={`${plexSans.variable} ${plexMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <InitColorSchemeScript attribute="data-mui-color-scheme" />
        <ThemeRegistry>
          {children}
          <AppVersion />
        </ThemeRegistry>
      </body>
    </html>
  );
}
