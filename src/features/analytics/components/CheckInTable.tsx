"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useMemo, useState } from "react";
import { fuzzyScore } from "@/lib/fuzzy";
import type { WaiverStatus } from "../types";

// One row, already formatted on the server (dates don't cross the boundary).
export type CheckInRow = {
  id: string;
  // Opens the climber on the front desk.
  href?: string;
  name: string;
  phone: string;
  checkedInAt: number;
  timeLabel: string;
  waiverStatus: WaiverStatus;
};

// "relevance" ranks search results by match quality; with no search it
// falls back to newest first.
type SortBy = "relevance" | "time" | "name";
type WaiverFilter = WaiverStatus | "all";

const WAIVER_COLOR = {
  valid: "success",
  expired: "warning",
  missing: "error",
} as const satisfies Record<WaiverStatus, string>;

const WAIVER_FILTERS: WaiverFilter[] = ["all", "valid", "expired", "missing"];

const digits = (s: string) => s.replace(/\D/g, "");

// Match quality for a row, 0 for no match. Number-only words are matched
// against the phone ("0105", "555-0105"); everything else is fuzzy matched
// against the name ("jmie", "chen jam", "jamei").
function searchScore(row: CheckInRow, query: string): number {
  const terms = query.split(/\s+/).filter(Boolean);
  const numbers = terms.filter((t) => /^[\d()+-]+$/.test(t)).map(digits);
  const words = terms.filter((t) => !/^[\d()+-]+$/.test(t));

  const phone = digits(row.phone);
  if (!numbers.every((n) => n === "" || phone.includes(n))) return 0;
  const nameScore = words.length ? fuzzyScore(row.name, words.join(" ")) : 1;
  return nameScore === 0 ? 0 : nameScore + numbers.length * 5;
}

export default function CheckInTable({ rows }: { rows: CheckInRow[] }) {
  const [query, setQuery] = useState("");
  const [waiver, setWaiver] = useState<WaiverFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("time");
  const [direction, setDirection] = useState<"asc" | "desc">("desc");

  const counts = useMemo(() => {
    const c: Record<WaiverFilter, number> = { all: rows.length, valid: 0, expired: 0, missing: 0 };
    for (const row of rows) c[row.waiverStatus]++;
    return c;
  }, [rows]);

  const searching = query.trim() !== "";

  const visible = useMemo(() => {
    const sign = direction === "asc" ? 1 : -1;
    return rows
      .filter((row) => waiver === "all" || row.waiverStatus === waiver)
      .map((row) => ({ row, score: searching ? searchScore(row, query) : 1 }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (sortBy === "name") return sign * a.row.name.localeCompare(b.row.name);
        if (sortBy === "time") return sign * (a.row.checkedInAt - b.row.checkedInAt);
        // Relevance: best match first, ties newest first.
        return b.score - a.score || b.row.checkedInAt - a.row.checkedInAt;
      })
      .map(({ row }) => row);
  }, [rows, waiver, query, searching, sortBy, direction]);

  function search(value: string) {
    // Starting a search ranks by best match; the column headers still override it.
    if (!searching && value.trim() !== "") setSortBy("relevance");
    setQuery(value);
  }

  function sort(by: SortBy) {
    if (sortBy === by) {
      setDirection(direction === "asc" ? "desc" : "asc");
    } else {
      setSortBy(by);
      // Names read A to Z; times newest first.
      setDirection(by === "name" ? "asc" : "desc");
    }
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 1.5,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <TextField
          size="small"
          type="search"
          label="Search name or phone"
          placeholder="Typos are OK"
          value={query}
          onChange={(e) => search(e.target.value)}
          sx={{ flex: "1 1 220px", maxWidth: { sm: 320 } }}
        />
        <ToggleButtonGroup
          size="small"
          exclusive
          value={waiver}
          onChange={(_, value: WaiverFilter | null) => value && setWaiver(value)}
          aria-label="Filter by waiver status"
          // Full width with equal buttons on phones, natural width otherwise.
          sx={{ width: { xs: "100%", sm: "auto" } }}
        >
          {WAIVER_FILTERS.map((status) => (
            <ToggleButton
              key={status}
              value={status}
              sx={{ textTransform: "none", flex: { xs: 1, sm: "none" }, px: { xs: 0.5, sm: 1.5 } }}
            >
              {status === "all" ? "All" : status[0].toUpperCase() + status.slice(1)} (
              {counts[status]})
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <TableContainer sx={{ mt: 1.5 }}>
        <Table size="small" aria-label="Recent check-ins">
          <TableHead>
            <TableRow>
              <TableCell sortDirection={sortBy === "name" ? direction : false}>
                <TableSortLabel
                  active={sortBy === "name"}
                  direction={sortBy === "name" ? direction : "asc"}
                  onClick={() => sort("name")}
                >
                  Name
                </TableSortLabel>
              </TableCell>
              <TableCell
                sortDirection={sortBy === "time" ? direction : false}
                sx={{ whiteSpace: "nowrap" }}
              >
                <TableSortLabel
                  active={sortBy === "time"}
                  direction={sortBy === "time" ? direction : "desc"}
                  onClick={() => sort("time")}
                >
                  Checked in
                </TableSortLabel>
              </TableCell>
              <TableCell>Waiver</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>
                  {row.href ? (
                    <Link href={row.href} className="hover:underline">
                      {row.name}
                    </Link>
                  ) : (
                    row.name
                  )}
                </TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{row.timeLabel}</TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    variant="outlined"
                    label={row.waiverStatus}
                    color={WAIVER_COLOR[row.waiverStatus]}
                  />
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={3}>
                  {rows.length === 0 ? "No check-ins yet." : "No check-ins match."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {visible.length !== rows.length && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Showing {visible.length} of {rows.length}
          {searching && sortBy === "relevance" && " · best matches first"}
        </Typography>
      )}
    </Box>
  );
}
