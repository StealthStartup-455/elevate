"use client";

import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import Link from "@mui/material/Link";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import { useState } from "react";
import DisabledReason from "@/components/ui/DisabledReason";
import StatusPill, { type Status } from "@/components/ui/StatusPill";
import type { Badge, Label, Tone } from "../day";
import BadgePill from "./BadgePill";

// One row as the page hands it over: plain values, already formatted on the
// server in the gym's time zone.
export type DeskTableRow = {
  id: string;
  climberId: string;
  name: string;
  time: string;
  badge: Badge;
  waiver: Label;
  message: Label;
};

type Paging = {
  /** "1–25 of 64" */
  range: string;
  page: number;
  pageCount: number;
  prevHref: string | null;
  nextHref: string | null;
};

// Waiver and Message are plain text: the words say the state, and a warning
// or problem is also colored and semibold (STYLE_GUIDE.md, "Status").
const TONE: Record<Tone, object> = {
  normal: {},
  warning: { color: "warning.main", fontWeight: 600 },
  error: { color: "error.main", fontWeight: 600 },
};

// The waiver is a status, so it's a pill like everywhere else on the desk.
const PILL = { normal: "ok", warning: "warn", error: "bad" } as const satisfies Record<Tone, Status>;

function Tinted({ label }: { label: Label }) {
  return (
    <Typography variant="body" component="span" sx={TONE[label.tone]}>
      {label.text}
    </Typography>
  );
}

function RowMenu({ row }: { row: DeskTableRow }) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  return (
    <>
      <IconButton
        // A text glyph, not an icon: keep the row as short as the text.
        sx={{ lineHeight: 1 }}
        aria-label={`More for ${row.name}`}
        aria-haspopup="menu"
        aria-expanded={anchor ? "true" : undefined}
        onClick={(e) => setAnchor(e.currentTarget)}
      >
        ···
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        <MenuItem component={NextLink} href={`/desk/customers/${row.climberId}`}>
          Open climber
        </MenuItem>
      </Menu>
    </>
  );
}

function PageArrow({ href, label, reason, children }: { href: string | null; label: string; reason: string; children: string }) {
  if (href) {
    return (
      <IconButton component={NextLink} href={href} aria-label={label} color="secondary" sx={{ lineHeight: 1 }}>
        {children}
      </IconButton>
    );
  }
  return (
    <DisabledReason reason={reason}>
      <IconButton aria-label={label} disabled sx={{ lineHeight: 1 }}>
        {children}
      </IconButton>
    </DisabledReason>
  );
}

// The day's check-ins on the Check-in page. "Filter list" narrows the rows on
// this page by name; paging, the day and the counts come from the server.
export default function DeskDayTable({
  title,
  rows,
  paging,
}: {
  title: string;
  rows: DeskTableRow[];
  paging: Paging;
}) {
  const [filter, setFilter] = useState("");
  const words = filter.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const shown = rows.filter((r) => words.every((w) => r.name.toLowerCase().includes(w)));

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <Typography variant="cardTitle">{title}</Typography>
        <TextField
          type="search"
          placeholder="Filter list"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          slotProps={{ htmlInput: { "aria-label": "Filter this page by name" } }}
        />
      </div>
      <div className="overflow-x-auto">
        <Table size="small" aria-label={title}>
          <TableHead>
            <TableRow>
              <TableCell>Time</TableCell>
              <TableCell>Climber</TableCell>
              <TableCell>Badge</TableCell>
              <TableCell>Waiver</TableCell>
              <TableCell>Message</TableCell>
              <TableCell align="right">
                <span className="sr-only">Actions</span>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shown.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{row.time}</TableCell>
                <TableCell>
                  <Link component={NextLink} href={`/desk/customers/${row.climberId}`} sx={{ fontWeight: 600 }}>
                    {row.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <BadgePill badge={row.badge} />
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>
                  {/* Valid and Expired are text-only here, as requested (STYLE_GUIDE.md). */}
                  <StatusPill
                    status={PILL[row.waiver.tone]}
                    label={row.waiver.text}
                    showIcon={row.waiver.tone !== "normal" && row.waiver.text !== "Expired"}
                  />
                </TableCell>
                <TableCell>
                  <Tinted label={row.message} />
                </TableCell>
                <TableCell align="right">
                  <RowMenu row={row} />
                </TableCell>
              </TableRow>
            ))}
            {shown.length === 0 && (
              <TableRow>
                <TableCell colSpan={6}>
                  <Typography variant="secondary" sx={{ py: 3 }}>
                    {rows.length === 0
                      ? "No check-ins on this day."
                      : `No one on this page matches "${filter.trim()}".`}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 p-3">
        <Typography variant="secondary">{paging.range}</Typography>
        <nav aria-label="Pages" className="flex items-center gap-1">
          <PageArrow href={paging.prevHref} label="Previous page" reason="This is the first page.">
            ‹
          </PageArrow>
          <Typography variant="body" component="span">
            Page {paging.page} of {paging.pageCount}
          </Typography>
          <PageArrow href={paging.nextHref} label="Next page" reason="This is the last page.">
            ›
          </PageArrow>
        </nav>
      </div>
    </Card>
  );
}
