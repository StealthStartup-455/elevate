"use client";

// Interactive examples for /style-guide. Each one is the pattern to copy into real screens.
import { useState } from "react";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import MuiLink from "@mui/material/Link";
import Switch from "@mui/material/Switch";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import NextLink from "next/link";
import StatusPill, { type Status } from "@/components/ui/StatusPill";

export function SettingsDemo() {
  const [range, setRange] = useState("today");
  const [pass, setPass] = useState("all");
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ToggleButtonGroup
        exclusive
        value={range}
        onChange={(_, next: string | null) => next && setRange(next)}
        aria-label="Timeframe"
      >
        <ToggleButton value="today">Today</ToggleButton>
        <ToggleButton value="week">Week</ToggleButton>
        <ToggleButton value="month">Month</ToggleButton>
      </ToggleButtonGroup>
      <TextField select label="Pass type" value={pass} onChange={(e) => setPass(e.target.value)} sx={{ minWidth: 160 }}>
        <MenuItem value="all">All</MenuItem>
        <MenuItem value="monthly">Unlimited monthly</MenuItem>
        <MenuItem value="punch">10-punch</MenuItem>
        <MenuItem value="day">Day pass</MenuItem>
      </TextField>
      <FormControlLabel control={<Checkbox defaultChecked />} label="Show expired" />
      <FormControlLabel control={<Switch />} label="Auto-refresh" />
    </div>
  );
}

const ROWS: { id: string; name: string; since: string; pass: string; waiver: [Status, string]; time: string }[] = [
  { id: "1", name: "Maya Okafor", since: "Member since 2022", pass: "Unlimited monthly", waiver: ["ok", "Valid"], time: "5:42 PM" },
  { id: "2", name: "Diego Ramírez", since: "Member since 2024", pass: "10-punch · 3 left", waiver: ["warn", "Expires Thu"], time: "5:39 PM" },
  { id: "3", name: "Sam Whitfield", since: "Member since 2019", pass: "Annual", waiver: ["bad", "Expired"], time: "5:31 PM" },
];

export function TableDemo() {
  return (
    <TableContainer>
      <Table size="small" aria-label="Example check-ins">
        <TableHead>
          <TableRow>
            <TableCell>Member</TableCell>
            <TableCell>Pass</TableCell>
            <TableCell>Waiver</TableCell>
            <TableCell align="right">In</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {ROWS.map((row) => (
            <TableRow key={row.id} hover>
              <TableCell>
                <MuiLink component={NextLink} href="#tables">
                  {row.name}
                </MuiLink>
                <Typography variant="secondary">{row.since}</Typography>
              </TableCell>
              <TableCell>{row.pass}</TableCell>
              <TableCell>
                <StatusPill status={row.waiver[0]} label={row.waiver[1]} />
              </TableCell>
              <TableCell align="right">
                <Typography variant="secondary" component="span">
                  {row.time}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export function FormDemo() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <TextField label="First name" defaultValue="Maya" />
      <TextField label="Phone" placeholder="604 555 0134" helperText="Used to find the member at the desk" />
      <TextField label="Date of birth" error defaultValue="31/02/2001" helperText="Enter a real date, like 14/03/2001" />
      <TextField label="Notes" multiline minRows={2} />
    </div>
  );
}
