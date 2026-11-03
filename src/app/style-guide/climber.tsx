import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Typography from "@mui/material/Typography";
import Announcement from "@/components/climber/Announcement";
import BusyBars from "@/components/climber/BusyBars";
import ClimberCard from "@/components/climber/ClimberCard";
import ClimberTheme from "@/components/climber/ClimberTheme";
import IconTile from "@/components/climber/IconTile";
import { ArrowIcon, SparkleIcon, WrenchIcon } from "@/components/climber/icons";
import TabBar from "@/components/climber/TabBar";
import DisabledReason from "@/components/ui/DisabledReason";
import StatusPill from "@/components/ui/StatusPill";
import {
  climberColors,
  climberControl,
  climberRadius,
  climberText,
  type ClimberTextStyle,
} from "@/components/ui/theme/climber/tokens";
import { SegmentedDemo } from "./demos";

// The climber app's look (/me), rendered inside ClimberTheme so every example uses the real
// climber theme. STYLE_GUIDE.md, "Climber app".

const L = climberColors.light;
const D = climberColors.dark;

// [label, palette path, light, dark, use]
const SWATCHES: [string, string, string, string, string][] = [
  ["Action", "primary.main", L.action.main, D.action.main, "Main buttons, the current tab, meters, links"],
  ["Action tint", "primary.soft", L.action.soft, D.action.soft, "Avatar, quiet highlights"],
  ["Page", "background.default", L.page, D.page, "Behind cards"],
  ["Card", "background.paper", L.surface, D.surface, "Cards, tab bar, fields"],
  ["Quiet fill", "background.subtle", L.subtle, D.subtle, "Disabled buttons, neutral tags"],
  ["Divider", "divider", L.line, D.line, "Rows inside cards, segmented track"],
  ["Text", "text.primary", L.text, D.text, "What people read"],
  ["Secondary text", "text.secondary", L.muted, D.muted, "Dates, descriptions"],
  ["Announcement", "inverse.bg", L.inverse.bg, D.inverse.bg, "The one dark card: an event coming up"],
  ["Announcement tag", "highlight.bg", L.highlight.bg, D.highlight.bg, "Its amber tag"],
];

const TYPE_ROWS: [keyof typeof climberText, string, string][] = [
  ["pageTitle", "Classes & events", "One per tab. Renders <h1>"],
  ["cardTitle", "Hours this week", "Card headings. Renders <h2>"],
  ["kpi", "Moderate", "The one big answer on a card"],
  ["body", "Intro to bouldering · Tue, Nov 3", "Everything people read"],
  ["secondary", "With Sam · Shoes included", "Supporting info. Muted color built in"],
  ["label", "Home  ·  In 12 days", "Tab labels, tags, chart axes"],
];

const TODAY = [7, 11, 8, 4, 2, 9, 14, 10, 4, 4, 14, 36, 52, 37, 17, 4];
const level = (v: number) => (v > 40 ? 4 : v >= 30 ? 3 : v >= 20 ? 2 : v >= 10 ? 1 : 0);

function Swatch({ label, path, light, dark, use }: { label: string; path: string; light: string; dark: string; use: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Box sx={{ height: 40, bgcolor: path, borderRadius: 3, border: 1, borderColor: "divider" }} />
      <Typography variant="body" sx={{ fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography variant="secondary" sx={{ fontFamily: "var(--font-plex-mono)", fontSize: "0.8125rem" }}>
        {path} · {light} / {dark}
      </Typography>
      <Typography variant="secondary">{use}</Typography>
    </div>
  );
}

export default function ClimberShowcase() {
  return (
    <Box sx={{ borderRadius: 2, overflow: "hidden", border: 1, borderColor: "divider" }}>
      <ClimberTheme>
        <div className="flex flex-col gap-4 p-5">
          <ClimberCard title="Colors">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SWATCHES.map(([label, path, light, dark, use]) => (
                <Swatch key={path} label={label} path={path} light={light} dark={dark} use={use} />
              ))}
            </div>
            <div className="flex flex-col gap-1">
              <Typography variant="body" sx={{ fontWeight: 700 }}>
                Busy-times shades, quiet to busy
              </Typography>
              <div className="flex gap-1">
                {L.heat.map((_, i) => (
                  <Box key={i} sx={{ width: 40, height: 24, borderRadius: 1, bgcolor: `heat.${i}` }} />
                ))}
                <Box sx={{ width: 40, height: 24, borderRadius: 1, bgcolor: "heatNow" }} />
              </div>
              <Typography variant="secondary">heat.0 to heat.4, then heatNow for the current hour</Typography>
            </div>
          </ClimberCard>

          <ClimberCard title="Text styles">
            <Typography variant="secondary">Figtree throughout. The desk&apos;s six style names, at phone sizes.</Typography>
            <div className="flex flex-col">
              {TYPE_ROWS.map(([name, sample, use]) => {
                const t: ClimberTextStyle = climberText[name];
                return (
                  <Box
                    key={name}
                    sx={{ py: 3, borderBottom: 1, borderColor: "divider", "&:last-child": { borderBottom: 0 } }}
                    className="grid gap-1 sm:grid-cols-2 sm:items-center"
                  >
                    <Typography variant={name}>{sample}</Typography>
                    <div>
                      <Typography variant="body" sx={{ fontFamily: "var(--font-plex-mono)", fontSize: "0.875rem" }}>
                        variant=&quot;{name}&quot;
                      </Typography>
                      <Typography variant="secondary">
                        {t.size}px · weight {t.weight} · {use}
                      </Typography>
                    </div>
                  </Box>
                );
              })}
            </div>
          </ClimberCard>

          <ClimberCard title="Actions">
            <Typography variant="secondary">
              Teal does something. One teal button per card; quiet actions are white with a border. Buttons are{" "}
              {climberControl.md}px tall, {climberRadius.md}px corners.
            </Typography>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="contained">Sign up</Button>
              <Button variant="outlined">Cancel sign-up</Button>
              <Button variant="text">Not now</Button>
              <DisabledReason reason="Every place is taken">
                <Button variant="contained" disabled>
                  Full
                </Button>
              </DisabledReason>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="contained" size="large">
                Simulate scan
              </Button>
              <Button variant="outlined" size="small">
                View
              </Button>
            </div>
          </ClimberCard>

          <ClimberCard title="Status and messages">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill status="ok" label="Open now" />
              <StatusPill status="warn" label="2 spots left" />
              <StatusPill status="bad" label="Closed" />
              <StatusPill status="neutral" label="Coming up" />
            </div>
            <div className="flex flex-col gap-2">
              <Alert severity="success">You&apos;re signed up for Yoga for climbers.</Alert>
              <Alert severity="error">That class is full.</Alert>
              <Alert severity="info">Your scan reached the desk.</Alert>
            </div>
          </ClimberCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <Announcement
              tag="In 12 days"
              title="Fall Send Fest bouldering comp"
              when="Sat, Nov 14 · 10 AM – 6 PM"
              details="Open to every level. Qualifiers in the morning, finals at 4 PM."
            >
              <Box
                component="a"
                href="#climber"
                sx={{ color: "inverse.text", typography: "body", fontWeight: 700, textDecoration: "none", display: "flex", alignItems: "center", gap: 1.5, minHeight: 44 }}
              >
                See all events <ArrowIcon size={20} />
              </Box>
            </Announcement>

            <ClimberCard tone="brand" label="Your plan">
              <Typography variant="secondary" sx={{ color: "inherit", opacity: 0.85 }}>
                Your plan
              </Typography>
              <Typography variant="pageTitle" component="p">
                Monthly membership
              </Typography>
              <Typography variant="body">Renews Fri, Nov 6</Typography>
            </ClimberCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <ClimberCard label="Right now">
              <div className="flex items-center justify-between gap-2">
                <StatusPill status="ok" label="Open now" />
                <Typography variant="secondary" component="span">
                  Closes at 10 PM
                </Typography>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <Typography variant="kpi">Moderate</Typography>
                <Typography variant="body" sx={{ fontWeight: 700 }}>
                  ~28 climbers
                </Typography>
              </div>
              <LinearProgress variant="determinate" value={47} aria-label="How full the gym is" />
              <BusyBars
                label="Usually busiest around 6 PM"
                max={52}
                bars={TODAY.map((v, i) => ({ value: v, level: level(v), now: i === 14 }))}
              />
            </ClimberCard>

            <ClimberCard title="New routes">
              <div className="flex items-start gap-3">
                <IconTile tone="warn">
                  <WrenchIcon />
                </IconTile>
                <div>
                  <Typography variant="body" sx={{ fontWeight: 700 }}>
                    Cave closes Wed for a reset
                  </Typography>
                  <Typography variant="secondary">9 AM – 2 PM · New circuit, V0 to V6</Typography>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <IconTile tone="ok">
                  <SparkleIcon />
                </IconTile>
                <div>
                  <Typography variant="body" sx={{ fontWeight: 700 }}>
                    Fresh problems on the Slab
                  </Typography>
                  <Typography variant="secondary">New since Wed, Oct 28</Typography>
                </div>
              </div>
              <SegmentedDemo />
            </ClimberCard>
          </div>

          <ClimberCard title="Tab bar">
            <Typography variant="secondary">
              At the bottom of every climber screen: an icon over a label, the current tab in teal.
            </Typography>
            <Box sx={{ maxWidth: 420, borderRadius: 3, overflow: "hidden", border: 1, borderColor: "divider" }}>
              <TabBar current="/me" sticky={false} />
            </Box>
          </ClimberCard>
        </div>
      </ClimberTheme>
    </Box>
  );
}
