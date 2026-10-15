"use client";

import Box from "@mui/material/Box";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Link from "next/link";
import { useMemo, useState } from "react";
import { fuzzyScore } from "@/lib/fuzzy";
import type { WaiverStatus } from "../types";
import WaiverBadge from "./WaiverBadge";

export type ClimberRow = {
  id: string;
  name: string;
  phone: string;
  dateOfBirth: string;
  waiverStatus: WaiverStatus;
};

const digits = (s: string) => s.replace(/\D/g, "");

// Match quality, 0 for no match. Number-only words match the phone, the rest
// fuzzy match the name (same rules as the check-in table).
export function searchScore(
  row: { name: string; phone: string },
  query: string,
): number {
  const terms = query.split(/\s+/).filter(Boolean);
  const numbers = terms.filter((t) => /^[\d()+-]+$/.test(t)).map(digits);
  const words = terms.filter((t) => !/^[\d()+-]+$/.test(t));

  const phone = digits(row.phone);
  if (!numbers.every((n) => n === "" || phone.includes(n))) return 0;
  const nameScore = words.length ? fuzzyScore(row.name, words.join(" ")) : 1;
  return nameScore === 0 ? 0 : nameScore + numbers.length * 5;
}

// Every climber, A to Z (the server sorts), with search. Rows open the climber.
export default function ClimberTable({ rows }: { rows: ClimberRow[] }) {
  const [query, setQuery] = useState("");
  const searching = query.trim() !== "";

  const visible = useMemo(() => {
    if (!searching) return rows;
    return rows
      .map((row) => ({ row, score: searchScore(row, query) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ row }) => row);
  }, [rows, query, searching]);

  return (
    <Box>
      <TextField
        size="small"
        type="search"
        label="Search name or phone"
        placeholder="Typos are OK"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ width: "100%", maxWidth: { sm: 320 } }}
      />

      <TableContainer sx={{ mt: 1.5 }}>
        <Table size="small" aria-label="Climbers">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Phone</TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Born</TableCell>
              <TableCell>Waiver</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>
                  <Link href={`/desk/climbers/${row.id}`} className="font-medium hover:underline">
                    {row.name}
                  </Link>
                </TableCell>
                <TableCell sx={{ display: { xs: "none", sm: "table-cell" }, whiteSpace: "nowrap" }}>
                  {row.phone}
                </TableCell>
                <TableCell sx={{ display: { xs: "none", md: "table-cell" }, whiteSpace: "nowrap" }}>
                  {row.dateOfBirth}
                </TableCell>
                <TableCell>
                  <WaiverBadge status={row.waiverStatus} />
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={4}>
                  {rows.length === 0 ? "No climbers yet." : "No climbers match."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {visible.length !== rows.length && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Showing {visible.length} of {rows.length}
        </Typography>
      )}
    </Box>
  );
}
