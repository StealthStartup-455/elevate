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
import MuiLink from "@mui/material/Link";
import Link from "next/link";
import { useMemo, useState } from "react";
import { searchScore } from "../search";
import type { WaiverStatus } from "../types";
import WaiverBadge from "./WaiverBadge";

export type ClimberRow = {
  id: string;
  name: string;
  phone: string;
  dateOfBirth: string;
  waiverStatus: WaiverStatus;
};

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

      <TableContainer sx={{ mt: 3 }}>
        <Table size="small" aria-label="Climbers">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Phone</TableCell>
              <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Born</TableCell>
              <TableCell>Waiver</TableCell>
              <TableCell>
                <span className="sr-only">Actions</span>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visible.map((row) => (
              <TableRow key={row.id} hover>
                <TableCell>
                  <MuiLink component={Link} href={`/desk/climbers/${row.id}`}>
                      {row.name}
                    </MuiLink>
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
                <TableCell align="right">
                  {/* Opens the climber's page in the form (#89). */}
                  <MuiLink
                    component={Link}
                    href={`/desk/climbers/${row.id}?edit=1`}
                    aria-label={`Edit ${row.name}`}
                  >
                    Edit
                  </MuiLink>
                </TableCell>
              </TableRow>
            ))}
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={5}>
                  {rows.length === 0 ? "No climbers yet." : "No climbers match."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {visible.length !== rows.length && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Showing {visible.length} of {rows.length}
        </Typography>
      )}
    </Box>
  );
}
