import type { Metadata } from "next";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import ColorModeToggle from "@/components/ui/ColorModeToggle";
import DisabledReason from "@/components/ui/DisabledReason";
import HelpTip from "@/components/ui/HelpTip";
import KpiTile from "@/components/ui/KpiTile";
import LinkArrow from "@/components/ui/LinkArrow";
import StatusPill from "@/components/ui/StatusPill";
import { colors, controlHeight, motion, radius, space, textStyles, type TextStyleName } from "@/components/ui/theme/tokens";
import { FormDemo, SettingsDemo, TableDemo } from "./demos";

// Live reference for STYLE_GUIDE.md. Everything here renders from the real theme, so if it
// looks wrong here it looks wrong everywhere.
export const metadata: Metadata = { title: "Style guide · Elevate", robots: { index: false } };

const L = colors.light;
const D = colors.dark;

// [label, MUI palette path, Tailwind class, light hex, dark hex, use]
const SWATCHES: { group: string; items: [string, string, string, string, string, string][] }[] = [
  {
    group: "Roles",
    items: [
      ["Actions", "primary.main", "bg-action", L.action.main, D.action.main, "Filled and tinted buttons: check in, save, buy, send"],
      ["Action tint", "primary.soft", "bg-action-soft", L.action.soft, D.action.soft, "Tinted button background"],
      ["Navigation & settings", "secondary.main", "text-nav", L.nav.main, D.nav.main, "Links, tabs, filters, segmented controls, focus ring"],
      ["Navigation tint", "secondary.soft", "bg-nav-soft", L.nav.soft, D.nav.soft, "Segmented-control track, help icon"],
    ],
  },
  {
    group: "Text",
    items: [
      ["Primary text", "text.primary", "text-fg", L.text, D.text, "What people came to read: names, values, titles"],
      ["Secondary text", "text.secondary", "text-fg-muted", L.muted, D.muted, "Timestamps, descriptions, units, labels"],
      ["Disabled text", "text.disabled", "text-fg-disabled", L.disabled, D.disabled, "Disabled controls only"],
    ],
  },
  {
    group: "Surfaces",
    items: [
      ["Page", "background.default", "bg-page", L.page, D.page, "Behind cards"],
      ["Cards", "background.paper", "bg-surface", L.surface, D.surface, "Cards, tables, fields"],
      ["Subtle fill", "background.subtle", "bg-subtle", L.subtle, D.subtle, "Row hover, disabled buttons"],
      ["Borders", "divider", "border-line", L.line, D.line, "Every 1px border and divider"],
    ],
  },
  {
    group: "Status",
    items: [
      ["Success", "success.main", "text-ok", L.ok.main, D.ok.main, "Valid, active, paid. Always with ✓"],
      ["Warning", "warning.main", "text-warn", L.warn.main, D.warn.main, "Expiring, waitlist. Always with !"],
      ["Danger", "error.main", "text-bad", L.bad.main, D.bad.main, "Expired, failed. Always with ✕"],
    ],
  },
  {
    group: "Charts",
    items: [
      ["Data", "chart.data", "bg-chart-data", L.chart.data, D.chart.data, "Bars and lines"],
      ["Now", "chart.now", "bg-chart-now", L.chart.now, D.chart.now, "The current hour or latest value"],
    ],
  },
];

const TYPE_ROWS: [TextStyleName, string, string][] = [
  ["pageTitle", "Front desk", "One per screen. Renders <h1>"],
  ["cardTitle", "Check-ins", "Card titles, the only other headings. Renders <h2>"],
  ["kpi", "142", "Big numbers in KPI tiles"],
  ["body", "Maya Okafor · Unlimited monthly", "Everything people read"],
  ["secondary", "Member since 2022 · in at 5:42 PM", "Supporting info. Muted color is built in"],
  ["label", "Belay cert", "Table column headers only. Muted and uppercase"],
];

const SPACE_ROWS: [string, number, string][] = [
  ["Page margin", space.page, "p-4 · sx p: 4"],
  ["Gap between cards", space.cardGap, "gap-3 · sx gap: 3"],
  ["Card padding", space.cardPadding, "p-3 · built into CardContent"],
  ["Gap inside cards", space.stack, "gap-2 · sx gap: 2"],
  ["Table cell padding, top and bottom", space.rowY, "built into TableCell"],
  ["Small control", controlHeight.sm, 'size="small"'],
  ["Regular control", controlHeight.md, "Default for buttons and fields"],
  ["Touch control", controlHeight.lg, 'size="large"; automatic on touch screens'],
];

function Section({ id, title, intro, children }: { id: string; title: string; intro: string; children: React.ReactNode }) {
  return (
    <Card id={id} component="section" className="scroll-mt-4">
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <Typography variant="cardTitle">{title}</Typography>
          <Typography variant="secondary">{intro}</Typography>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

export default function StyleGuidePage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-3 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <Typography variant="pageTitle">Style guide</Typography>
          <Typography variant="secondary">
            The live version of STYLE_GUIDE.md. Every example uses the real theme. Crimp density, granite palette.
          </Typography>
        </div>
        <ColorModeToggle />
      </div>

      <Section id="colors" title="Colors" intro="Greys build the structure. Color only appears where it means something.">
        <div className="flex flex-col gap-4">
          {SWATCHES.map((group) => (
            <div key={group.group} className="flex flex-col gap-2">
              <Typography variant="label">{group.group}</Typography>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {group.items.map(([label, path, tw, light, dark, use]) => (
                  <div key={path} className="flex flex-col gap-1">
                    <Box sx={{ height: 36, bgcolor: path, borderRadius: 1, border: 1, borderColor: "divider" }} />
                    <Typography variant="body" sx={{ fontWeight: 600 }}>
                      {label}
                    </Typography>
                    <Typography variant="secondary" sx={{ fontFamily: "var(--font-mono)" }}>
                      {path} · {tw}
                      <br />
                      {light} / {dark}
                    </Typography>
                    <Typography variant="secondary">{use}</Typography>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section id="type" title="Text styles" intro="Six styles and no others. IBM Plex Sans, condensed for headers.">
        <div className="flex flex-col">
          {TYPE_ROWS.map(([name, sample, use]) => {
            const t = textStyles[name];
            return (
              <div key={name} className="grid gap-1 border-b py-2 last:border-b-0 sm:grid-cols-2 sm:items-center">
                <Typography variant={name}>{sample}</Typography>
                <div>
                  <Typography variant="body" sx={{ fontFamily: "var(--font-mono)" }}>
                    variant=&quot;{name}&quot;
                  </Typography>
                  <Typography variant="secondary">
                    {t.size}px / {Math.round(t.size * t.lineHeight)}px · weight {t.weight} · {use}
                  </Typography>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      <Section id="spacing" title="Spacing and size" intro="Everything is a multiple of 4px. MUI spacing(1) and Tailwind's p-1 are both 4px.">
        <div className="flex flex-col">
          {SPACE_ROWS.map(([label, value, code]) => (
            <div key={label} className="flex items-center gap-3 border-b py-2 last:border-b-0">
              <Typography variant="body" className="flex-1 sm:w-56 sm:flex-none">
                {label}
              </Typography>
              <div className="hidden flex-1 sm:block">
                <Box sx={{ height: 10, width: value * 3, bgcolor: "chart.data", borderRadius: 0.5 }} />
              </div>
              <Typography variant="secondary" sx={{ fontFamily: "var(--font-mono)", textAlign: "right" }}>
                {value}px · {code}
              </Typography>
            </div>
          ))}
        </div>
      </Section>

      <Section id="shape" title="Corners and depth" intro="Three radii plus round. Cards are flat. Only floating things get a shadow.">
        <div className="grid gap-3 sm:grid-cols-4">
          {(
            [
              ["Small", radius.sm, "rounded-sm", "Tags, tooltips, chart bars"],
              ["Medium", radius.md, "rounded-md", "Buttons, fields, chips, menus"],
              ["Large", radius.lg, "rounded-lg", "Cards and tiles"],
              ["Round", radius.full, "rounded-full", "Status pills, avatars, help icons"],
            ] as const
          ).map(([label, r, tw, use]) => (
            <div key={label} className="flex flex-col gap-1">
              <Box sx={{ height: 48, bgcolor: "secondary.soft", border: 1, borderColor: "divider", borderRadius: `${r}px` }} />
              <Typography variant="body" sx={{ fontWeight: 600 }}>
                {label} · {r === radius.full ? "full" : `${r}px`}
              </Typography>
              <Typography variant="secondary">
                {tw} · {use}
              </Typography>
            </div>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent>
              <Typography variant="cardTitle">Flat card</Typography>
              <Typography variant="secondary">1px border, no shadow</Typography>
            </CardContent>
          </Card>
          <Box sx={{ p: 2, borderRadius: 0.5, bgcolor: "text.primary", color: "background.paper", boxShadow: 8 }}>
            <Typography variant="secondary" sx={{ color: "inherit" }}>
              Tooltips, menus and dialogs float above the page, so they get the only shadow.
            </Typography>
          </Box>
        </div>
      </Section>

      <Section id="actions" title="Actions" intro="Violet does something. One filled button per card; every other action is tinted.">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="contained">Check in member</Button>
          <Button variant="outlined">Sell day pass</Button>
          <Button variant="text">Undo</Button>
          <DisabledReason reason="No waivers expire in the next 7 days">
            <Button variant="outlined" disabled>
              Send reminders
            </Button>
          </DisabledReason>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="contained" size="small">
            Small · {controlHeight.sm}px
          </Button>
          <Button variant="contained">Regular · {controlHeight.md}px</Button>
          <Button variant="contained" size="large">
            Touch · {controlHeight.lg}px
          </Button>
        </div>
        <Typography variant="secondary">
          Hover darkens the fill or deepens the tint in {motion.duration}ms. The disabled button explains itself on hover
          and on keyboard focus.
        </Typography>
      </Section>

      <Section
        id="navigation"
        title="Navigation and settings"
        intro="Slate blue moves you around or changes what you see. Links get an arrow; settings are segmented controls, selects and toggles."
      >
        <div className="flex flex-wrap items-center gap-4">
          <LinkArrow href="#navigation">View all check-ins</LinkArrow>
          <Typography variant="body" component="span">
            On the wall now <HelpTip title="People checked in during the last 3 hours" label="About on the wall now" />
          </Typography>
        </div>
        <SettingsDemo />
      </Section>

      <Section id="status" title="Status" intro="Green, amber and red only describe state, and always come with an icon.">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status="ok" label="Valid" />
          <StatusPill status="warn" label="Expires Thu" />
          <StatusPill status="bad" label="Payment failed" />
          <StatusPill status="neutral" label="Day pass" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Alert severity="success">Waiver signed. Valid until Oct 2027.</Alert>
          <Alert severity="warning">9 waivers expire this week.</Alert>
          <Alert severity="error">The card was declined. Ask for another payment method.</Alert>
          <Alert severity="info">Wall reset on Wednesday. The Cave is closed 9 AM to 2 PM.</Alert>
        </div>
      </Section>

      <Section id="cards" title="KPI tiles" intro="Big numbers are not clickable, so they never react to hover. Follow-ups go inside as a link or a button.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile label="Checked in today" value="142" detail="▲ 14 vs last Monday" tone="up" />
          <KpiTile
            label={
              <>
                On the wall now <HelpTip title="People checked in during the last 3 hours" label="About on the wall now" />
              </>
            }
            value="37"
            detail="of 120 capacity"
          />
          <KpiTile label="Waivers expiring this week" value="9" detail="Reminders not sent" tone="warn">
            <Button variant="outlined" size="small">
              Send reminders
            </Button>
          </KpiTile>
          <KpiTile label="Failed payments" value="4" detail="$316 at risk" tone="bad">
            <LinkArrow href="#cards">Review</LinkArrow>
          </KpiTile>
        </div>
      </Section>

      <Section id="tables" title="Tables" intro="Column labels are uppercase and muted. Rows that open something highlight on hover, and their main cell is a link.">
        <TableDemo />
      </Section>

      <Section id="forms" title="Fields" intro="28px tall at the desk, 40px on touch screens, where text is 16px so phones don't zoom in.">
        <FormDemo />
      </Section>
    </main>
  );
}
