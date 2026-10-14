# components/ui

Shared, generic UI used across features, and the theme everything is built on. No business logic. If a component is only used by one feature, put it in that feature's `components/` folder.

How to use all of this: [`STYLE_GUIDE.md`](../../../STYLE_GUIDE.md). Live examples: `/style-guide`.

| File | What it is |
|---|---|
| `theme/tokens.ts` | Every color, size, radius and timing. The single source. |
| `theme/theme.ts` | The MUI theme built from the tokens, including hover, focus and density rules. |
| `theme/mui-augment.d.ts` | TypeScript types for the custom palette colors and the six text styles. |
| `theme/fonts.ts` | IBM Plex Sans and IBM Plex Mono via `next/font`. |
| `ThemeRegistry.tsx` | Wraps the app in the theme (used by the root layout). |
| `LinkArrow.tsx` | Link to another page, with an arrow. |
| `HelpTip.tsx` | "?" with a tooltip. |
| `DisabledReason.tsx` | Wraps a disabled control so it can say why. |
| `StatusPill.tsx` | Status chip that always has its icon. |
| `KpiTile.tsx` | Big number with a label. |
| `ColorModeToggle.tsx` | Light / system / dark switch. |
