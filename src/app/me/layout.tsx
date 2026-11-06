import { Suspense } from "react";
import ClimberTheme from "@/components/climber/ClimberTheme";
import TabBar, { TabBarView } from "@/components/climber/TabBar";

// The climber app: its own phone look (STYLE_GUIDE.md, "Climber app") and a bottom tab bar
// for Home, Check in, Membership and Classes (#101). Logging out is on the Membership tab.
export default function MeLayout({ children }: LayoutProps<"/me">) {
  return (
    <ClimberTheme>
      <main className="mx-auto flex w-full max-w-narrow flex-1 flex-col gap-4 px-5 pb-8 pt-6">{children}</main>
      {/* The tab bar reads the URL to mark the current tab; until then, the same bar unmarked. */}
      <Suspense fallback={<TabBarView active={null} />}>
        <TabBar />
      </Suspense>
    </ClimberTheme>
  );
}
