# Elevate style guide

How Elevate looks and behaves, written for developers and AI coding agents. The rules here are enforced by the theme, the shared components and lint wherever possible, so following them is mostly a matter of using what already exists.

- **Live reference:** run `npm run dev` and open [`/style-guide`](http://localhost:3000/style-guide). Every example there renders from the real theme, in light and dark.
- **Values:** [`src/components/ui/theme/tokens.ts`](src/components/ui/theme/tokens.ts) is the single source for every color, size, radius and timing.
- **MUI theme:** [`src/components/ui/theme/theme.ts`](src/components/ui/theme/theme.ts) builds the theme from the tokens. Hover, focus and density rules live in its component overrides.
- **Tailwind:** [`src/app/globals.css`](src/app/globals.css) maps the same tokens to Tailwind classes and removes Tailwind's own palette, type scale, radii and shadows.
- **Shared components:** [`src/components/ui/`](src/components/ui/).

The look is **granite** colors at **Crimp** density: near-greyscale, compact and squared-off, built for a front-desk screen that has to show a lot at once.

## The rules in one screen

Do:

1. Use MUI components for anything interactive and for all text. Use Tailwind only for layout.
2. Use `<Typography variant="...">` with one of the six text styles: `pageTitle`, `cardTitle`, `kpi`, `body`, `secondary`, `label`.
3. Put **one** `pageTitle` on each screen. Card titles are the only other headings.
4. Make supporting information secondary: timestamps, descriptions, units, "member since". If you're unsure, it's secondary.
5. Use teal (`color="primary"`, the default) only for things that **do something**: check in, save, buy, send, generate.
6. Use slate blue (`color="secondary"`) only for things that **move you around or change the view**: links, tabs, filters, timeframes, toggles.
7. Put at most **one** filled button (`variant="contained"`) in each card or area. Every other action is `variant="outlined"`, which renders as a tinted button.
8. Show status with `<StatusPill>`, so green, amber and red always come with ✓, ! or ✕.
9. Space things with the 4px scale: `gap-2`, `p-3`, `sx={{ mt: 2 }}`. Both `p-3` and `sx={{ p: 3 }}` are 12px.
10. Write in sentence case: "Check in member", not "Check In Member".

Never:

1. Write a raw color (`#fff`, `rgb(...)`) outside `tokens.ts`. Lint rejects it.
2. Use Tailwind arbitrary values (`p-[13px]`, `max-w-[560px]`), text sizes (`text-2xl`), font weights (`font-semibold`) or palette colors (`bg-green-500`). Lint rejects them.
3. Add a shadow to a card. Only tooltips, menus and dialogs float.
4. Make something look clickable that isn't, or leave something clickable without a hover state.
5. Put essential information only in a tooltip.

## Why these choices

This section summarizes the color research behind the guide (elevate-docs#16).

- **Fit matters more than "color meanings".** The most reliable finding is that people judge whether a color seems *right for the product* (Bottomley & Doyle, 2006), not that red means passion or blue means trust.
- **Brightness and saturation matter as much as hue** (Valdez & Mehrabian, 1994). That's why the palette is muted and close to grey.
- **Brand personality:** Labrecque & Milne (2012) link colors to personality traits. A business tool for gym owners has to read as *competent* first, so the base is calm granite greys, and the climbing personality comes through accents, type and content.
- **Color carries meaning in this app.** Hold colors, waiver status and failed payments all use color, so the interface stays neutral and saves color for meaning. That's also why roles get their own colors: teal does something, slate blue takes you somewhere.
- **Teal** (`#00615F`) gives actions a confident brand color that fits the granite greys. It sits fairly close to the success green, especially for people with red-green color blindness, so success is never shown by color alone: `StatusPill` always adds ✓, and actions are always buttons, never pills.
- **Accessibility is built in.** About 1 in 12 men has some color blindness, mostly red-green. Every text color pairing passes WCAG 2.2 AA (4.5:1) in both themes, the lowest being 4.8:1. Status always has an icon, and roles always have a distinct shape (filled button, arrow link, segmented control), so nothing depends on color alone.

Further reading: Elliot & Maier (2014), *Color psychology*, Annual Review of Psychology; Labrecque & Milne (2012), *Exciting red and competent blue*, Journal of the Academy of Marketing Science; *Refactoring UI* (Wathan & Schoger), chapter on color.

## Color

### Roles

| Role | Use for | MUI | Tailwind | Light | Dark |
|---|---|---|---|---|---|
| Actions (teal) | Buttons that do something | `primary.main`, `color="primary"` | `bg-action`, `text-action` | `#00615F` | `#64BCB9` |
| Action tint | Tinted (outlined) buttons | `primary.soft` | `bg-action-soft` | `#E0F5F4` | `#163432` |
| Navigation and settings (slate blue) | Links, tabs, filters, toggles, focus ring | `secondary.main`, `color="secondary"` | `text-nav`, `bg-nav` | `#26426C` | `#AAC6EF` |
| Navigation tint | Segmented-control track, help icon | `secondary.soft` | `bg-nav-soft` | `#EAF1FB` | `#242E3E` |

In MUI, **primary = actions** and **secondary = navigation and settings**. Links, tabs, toggle buttons, checkboxes, switches and fields already default to `secondary` in the theme, so you rarely set it yourself.

### Text

| Level | Use for | MUI | Tailwind | Light | Dark |
|---|---|---|---|---|---|
| Primary | What people came to read: names, values, titles | `text.primary` | `text-fg` | `#1F2326` | `#E5E8EA` |
| Secondary | Supporting info: timestamps, descriptions, units, labels | `text.secondary` | `text-fg-muted` | `#5C6166` | `#9FA6AA` |
| Disabled | Disabled controls only (the one text color below 4.5:1) | `text.disabled` | `text-fg-disabled` | `#8A9095` | `#646B70` |

### Surfaces

| Surface | MUI | Tailwind | Light | Dark |
|---|---|---|---|---|
| Page, behind cards | `background.default` | `bg-page` | `#EDEFF1` | `#15181A` |
| Cards, tables, fields | `background.paper` | `bg-surface` | `#FFFFFF` | `#1C2022` |
| Subtle fill: row hover, disabled buttons | `background.subtle` | `bg-subtle` | `#F3F5F6` | `#24272A` |
| Borders and dividers | `divider` | `border-line` (the default border color) | `#DBDEE1` | `#313538` |

### Status

Green, amber and red only describe state. They are never used for decoration, and for actions only in the two cases below.

Two buttons take a status color, because the action is about a status:

- **Destructive** (revoke, remove): `color="error"` (red), on the button and on its confirm button in the dialog. The confirm is the dialog's one `contained` button.
- **Renew**: `color="warning"` (amber), for the "Renew membership" button and the renewal rows on the POS. Teal stays for every other action, including buying.

An **expired membership** is red wherever it shows: the `StatusPill` (`status="bad"`, ✕), and the "Ended …" line next to it (`color="error"`).

| Status | Use for | MUI | Tailwind | Icon |
|---|---|---|---|---|
| Success | Valid, active, paid | `success` | `text-ok`, `bg-ok-soft` | ✓ |
| Warning | Expiring, waitlist, needs attention soon | `warning` | `text-warn`, `bg-warn-soft` | ! |
| Danger | Expired, failed, blocked | `error` | `text-bad`, `bg-bad-soft` | ✕ |
| Info | Neutral notices (uses navigation blue) | `info` | `text-nav` | ⓘ (Alert's default icon) |

### Charts

Chart data is grey (`chart.data`, `bg-chart-data`). The current or latest value is dark granite (`chart.now`). Heat maps use shades of `chart.now`. Charts never use the action or status colors unless the chart is about status.

### Dark mode

Dark mode follows the system setting by default. `<ColorModeToggle>` lets a user pick light, system or dark; the choice is saved in the browser and applied before the first paint, so there's no flash. Colors come from CSS variables, so MUI and Tailwind switch together and you almost never need `dark:` classes. If you do, `dark:` is wired to the same switch.

## Type

Two faces from one family: **IBM Plex Sans** for everything, and IBM Plex Sans at 85% width (the condensed cut) for headers. **IBM Plex Mono** is only for codes, IDs and usernames (`sx={{ fontFamily: "var(--font-mono)" }}` or `className="font-mono"`).

### The six text styles

| Variant | Size / line height | Weight | Renders | Use for |
|---|---|---|---|---|
| `pageTitle` | 20 / 24px, condensed | 700 | `<h1>` | One per screen |
| `cardTitle` | 14 / 18px, condensed | 600 | `<h2>` | Card titles, the only other headings |
| `kpi` | 24 / 26px, condensed | 600 | `<p>` | Big numbers |
| `body` | 13 / 20px | 400 | `<p>` | Everything people read |
| `secondary` | 12 / 17px, muted color built in | 400 | `<p>` | Supporting info |
| `label` | 11 / 14px, uppercase, muted | 600 | `<span>` | Table column headers only |

```tsx
<Typography variant="pageTitle">Front desk</Typography>
<Typography variant="secondary">Monday, October 12 · Open until 11 PM</Typography>
<Typography variant="secondary" component="span">5:42 PM</Typography> {/* inline */}
```

- Use regular and semibold (`sx={{ fontWeight: 600 }}`) in running text. Bold belongs to titles and big numbers.
- Use uppercase only for `label`.
- Numbers use tabular figures everywhere, so columns line up. Right-align numbers in tables (`<TableCell align="right">`).
- Keep running text under about 70 characters a line.

### MUI's built-in variants

MUI's own components use its built-in variants, and screens written before this guide do too, so they still exist. They're restyled to match the six styles:

| Built-in | Renders like |
|---|---|
| `h1` to `h5` | `pageTitle` |
| `h6` | `cardTitle` |
| `subtitle1`, `subtitle2` | `body`, semibold |
| `body1` | `body` |
| `body2`, `caption` | `secondary`, without the muted color |
| `overline` | `label`, without the muted color |

New code uses the six names. Moving older screens over is a follow-up.

## Spacing and size

Everything sits on a **4px grid**. MUI's spacing unit and Tailwind's spacing step are both 4px, so `sx={{ p: 3 }}` and `className="p-3"` are the same 12px.

| Token | Value | Tailwind | `sx` |
|---|---|---|---|
| Page margin | 16px | `p-4` | `p: 4` |
| Gap between cards | 12px | `gap-3` | `gap: 3` |
| Card padding | 12px | `p-3` | built into `CardContent` |
| Gap inside a card | 8px | `gap-2` | `gap: 2` |
| Table cell padding, top and bottom | 6px | n/a | built into `TableCell` |
| Narrow page width (forms, member pages) | 560px | `max-w-narrow` | n/a |

Closer means related: the gap inside a card is smaller than the gap between cards, which is smaller than the page margin.

### Control heights

| Height | Where | How |
|---|---|---|
| 24px | Small buttons, segmented controls, chips | `size="small"` |
| 28px | Regular buttons and fields: the default at the desk | default |
| 40px | Touch | `size="large"` for buttons, `size="medium"` for fields |

**On touch screens (phones, tablets), every button, field, menu item and segmented control grows to 40px automatically**, and fields use 16px text so iOS doesn't zoom in. You don't need separate mobile sizes. Click targets are never smaller than 24px (the WCAG 2.2 minimum).

### Breakpoints

MUI breakpoints match Tailwind's: `sm` 640px, `md` 768px, `lg` 1024px, `xl` 1280px. So `sx={{ p: { sm: 3 } }}` and `sm:p-3` switch at the same width.

## Corners, borders and depth

| Radius | Value | Tailwind | `sx` | Use for |
|---|---|---|---|---|
| Small | 2px | `rounded-sm` | `borderRadius: 0.5` | Tags, tooltips, chart bars |
| Medium | 4px | `rounded-md` | `borderRadius: 1` | Buttons, fields, chips, menus |
| Large | 6px | `rounded-lg` | `borderRadius: 1.5` | Cards and tiles |
| Round | full | `rounded-full` | `borderRadius: "50%"` | Status pills, avatars, help icons |

- A shape inside another uses the outer radius minus the gap between them, so the curves stay parallel. The segmented control does this: a 4px track around 2px segments.
- Cards are flat: a 1px border and no shadow. `<Card>` defaults to this.
- Only things that float above the page get a shadow: tooltips, menus, popovers and dialogs (`shadow-float`, or MUI elevation 6 and above). Elevation below 6 is flat.
- Borders are 1px in the border color. Only focus rings are thicker.

## Hover, focus and states

**If it does something, it reacts to hover. If it doesn't, it never changes.** All of the hover states below are built into the theme and the shared components, so you get them by using the right component.

| Control | Hover | Pressed or selected |
|---|---|---|
| Filled button (`contained`) | Fill darkens | Darker still while pressed |
| Tinted button (`outlined`) | Tint deepens, border darkens | Border stays dark |
| Text button | Tint appears behind it | n/a |
| Link (`<Link>`, `<LinkArrow>`) | Underline appears; the arrow nudges right | Opens the page |
| Segmented control, select | Tint deepens | Selected option fills slate blue |
| Help icon (`<HelpTip>`) | Fills slate blue; the tooltip appears after 250ms | Tooltip also opens on keyboard focus |
| Table row that opens something (`<TableRow hover>`) | Subtle grey fill | The main cell is a link |
| Field | Border darkens | Focused border is slate blue |
| Disabled control | Nothing changes. Not-allowed cursor, tooltip saying why | Nothing happens |
| Cards, KPI tiles, status pills | Nothing changes | Not clickable |

- **Keyboard focus is always visible:** a 2px slate-blue ring, 2px outside the element, on every MUI control. Don't remove outlines.
- The pointer cursor appears only on clickable things.
- **Nothing essential lives only in a tooltip.** Tooltips explain or repeat.
- **Disabled controls stay in place**, greyed out, and say why. Wrap them in `<DisabledReason>`.
- State changes take 120ms. MUI's ripple effect is turned off. Motion turns off for people who ask for reduced motion.

## MUI and Tailwind: who owns what

| | MUI | Tailwind |
|---|---|---|
| Owns | Every interactive component and its states: buttons, links, fields, selects, toggles, tooltips, tables, menus, dialogs, chips. All text. | Layout: `flex`, `grid`, `gap`, padding and margin, width and max-width, breakpoints, `hidden`. |
| Colors | Palette props and `sx` paths: `color="secondary"`, `sx={{ color: "text.secondary" }}` | Token classes for layout surfaces: `bg-surface`, `bg-page`, `border-line`, `text-fg-muted` |
| Never | Raw values in `sx` (colors, px strings) | Text styling, palette colors, arbitrary values, color classes on MUI components |

MUI styles sit in a CSS layer below Tailwind utilities, so a Tailwind class on an MUI component wins. Use that for layout (`className="w-full"`), not to restyle it.

## Components

Use MUI's own components wherever they exist. `src/components/ui/` adds a few that MUI doesn't have:

| Component | Use for |
|---|---|
| `LinkArrow` | "View all", "Open schedule": a link to another page, with an arrow |
| `HelpTip` | A "?" that explains the thing next to it |
| `DisabledReason` | Wraps a disabled control so it can say why |
| `StatusPill` | Any status: valid, expiring, failed. Always has its icon |
| `KpiTile` | A big number with a label, optional detail and an optional follow-up action |
| `ColorModeToggle` | Light / system / dark switch |
| `Logo` | The Elevate logo. `variant="inline"` (default) in nav bars, `variant="full"` (with the tagline) on the login page. The mountain is teal as the brand color; that is not an action |

### Buttons

```tsx
<Button variant="contained">Check in member</Button>   {/* the one main action */}
<Button variant="outlined">Sell day pass</Button>      {/* every other action: tinted */}
<Button variant="text">Undo</Button>                   {/* low emphasis */}
<Button variant="outlined" size="small">Send reminders</Button>

<DisabledReason reason="No waivers expire in the next 7 days">
  <Button variant="outlined" disabled>Send reminders</Button>
</DisabledReason>
```

A button that navigates is still a link. Use `<LinkArrow>` or a `<Link>`, not a filled button. The existing `LinkButton` in `features/climbers` predates this guide.

### Navigation and settings

```tsx
<LinkArrow href="/desk/climbers">View all climbers</LinkArrow>

<ToggleButtonGroup exclusive value={range} onChange={(_, v) => v && setRange(v)} aria-label="Timeframe">
  <ToggleButton value="today">Today</ToggleButton>
  <ToggleButton value="week">Week</ToggleButton>
</ToggleButtonGroup>

<TextField select label="Pass type" value={pass} onChange={(e) => setPass(e.target.value)}>
  <MenuItem value="all">All</MenuItem>
</TextField>

<Typography variant="secondary">
  On the wall now <HelpTip title="People checked in during the last 3 hours" label="About on the wall now" />
</Typography>
```

Links inside MUI need Next's router: `<Link component={NextLink} href="...">` (`import Link from "@mui/material/Link"`, `import NextLink from "next/link"`). That has to happen in a client component, which is why `LinkArrow` is one.

### Status

```tsx
<StatusPill status="ok" label="Valid" />
<StatusPill status="warn" label="Expires Thu" />
<StatusPill status="bad" label="Payment failed" />
<StatusPill status="neutral" label="Day pass" />

<Alert severity="warning">9 waivers expire this week.</Alert>
```

### Cards, tables and KPI tiles

```tsx
<Card>
  <CardContent className="flex flex-col gap-2">
    <div className="flex flex-wrap items-center gap-2">
      <Typography variant="cardTitle">Check-ins</Typography>
      <Typography variant="secondary" component="span">Last 30 minutes</Typography>
    </div>
    <Table size="small">…</Table>
    <LinkArrow href="/desk">View all check-ins</LinkArrow>
  </CardContent>
</Card>

<KpiTile label="Waivers expiring this week" value="9" detail="Reminders not sent" tone="warn">
  <Button variant="outlined" size="small">Send reminders</Button>
</KpiTile>
```

In tables, `TableHead` cells get the `label` style automatically. Use `hover` only on rows that open something, and make the row's main cell a link.

## Page patterns

**Staff page** (`/desk/...`): full width with the page margin.

```tsx
<div className="flex flex-col gap-3">
  <div className="flex flex-wrap items-center justify-between gap-2">
    <Typography variant="pageTitle">Front desk</Typography>
    <Button variant="contained">Check in member</Button>
  </div>
  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{/* KpiTiles */}</div>
  <div className="grid gap-3 lg:grid-cols-3">{/* cards */}</div>
</div>
```

**Member page or form** (`/me`, `/join`): one narrow column.

```tsx
<div className="mx-auto flex w-full max-w-narrow flex-col gap-3">
  <Typography variant="pageTitle">My dashboard</Typography>
  <Card>…</Card>
</div>
```

## Writing

- Sentence case for everything: titles, buttons, labels, menu items.
- Name things the way gym staff and climbers do: "Check in member", "Waiver expired", "Belay cert".
- A button says exactly what happens ("Send reminders"), and the confirmation repeats it ("Reminders sent").
- Errors say what went wrong and how to fix it: "Enter a real date, like 14/03/2001."

## Accessibility checklist

Before you open a pull request for UI work:

- [ ] Every control can be reached and used with the keyboard, and the focus ring is visible.
- [ ] Nothing depends on color alone: status has an icon, roles have their shape.
- [ ] Icon-only buttons have an `aria-label`. `HelpTip` takes a `label`.
- [ ] Text uses theme colors only (lint checks this), so contrast stays at AA.
- [ ] Disabled controls say why (`DisabledReason`).
- [ ] The screen works at 375px wide, and on touch.
- [ ] You checked `/style-guide` or the screen in both light and dark.

## Changing the system

The rules are deliberately hard to bypass. To change them:

- **A value** (a color, a size): change `tokens.ts`. Everything follows, MUI and Tailwind alike.
- **A new color or text style:** add it to `tokens.ts`, wire it through `theme.ts` (and `mui-augment.d.ts` for types) and `globals.css`, add it to `/style-guide`, and document it here in the same pull request. Ask the team first; every addition makes the app less consistent.
- **A component's look or hover behavior:** change its override in `theme.ts`, not the screen.
- **A genuine exception** (for example, a QR code must stay black on white in dark mode): disable the lint rule on that line with a reason, as in `DemoQrCode.tsx`:

  ```tsx
  {/* eslint-disable-next-line no-restricted-syntax -- QR codes stay dark on white so scanners can read them */}
  ```

## What lint checks

`npm run lint` fails on these anywhere in `src/` outside `src/components/ui/theme/`:

- Raw colors in strings: `#fff`, `#1F2326`, `rgb(...)`, `hsl(...)`, `oklch(...)`.
- Tailwind arbitrary values in `className`: `p-[13px]`, `max-w-[560px]`, `grid-cols-[1fr_2fr]`.
- Tailwind text sizes, font weights and palette colors in `className`: `text-2xl`, `font-semibold`, `bg-green-500`.

Tailwind's own palette, type scale, radii and shadows are also removed in `globals.css`, so those classes render nothing even if lint is skipped.

Lint doesn't yet check MUI variant names or `sx` values. Reviewers check those.
