"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useState } from "react";
import StatusPill from "@/components/ui/StatusPill";
import { useBackdropClose } from "@/components/ui/useBackdropClose";
import { useDeskDialogOpen } from "@/features/check-ins/desk-dialogs";
import { formatMoney } from "../cart";
import { TENDER_LABEL, cashOutSummary, parseDollars } from "../cashout";
import type { SaleSummary } from "../types";

// Where each payment type's money should be at the end of the day.
const TENDER_WHERE = {
  CARD: "On the card machine",
  CASH: "In the till",
  ONLINE: "Paid in the app",
} as const;

// End of day cash out: today's paid sales added up by payment type, with the
// taxes, and a count of the till against the cash sales.
export default function CashOutDialog({
  open,
  onClose,
  sales,
}: {
  open: boolean;
  onClose: () => void;
  sales: SaleSummary[];
}) {
  // Hold the scan popup while cashing out (#92, #127).
  useDeskDialogOpen(open);
  const [counted, setCounted] = useState("");
  const summary = cashOutSummary(sales);
  const cash = summary.byTender.find((t) => t.tender === "CASH")!;
  const countedCents = parseDollars(counted);
  const difference = countedCents === null ? null : countedCents - cash.totalCents;

  function close() {
    setCounted("");
    onClose();
  }

  // Outside clicks close it too, but not the second click of a double-click (#134, #218).
  const onDialogClose = useBackdropClose(open, close);

  return (
    <Dialog
      open={open}
      onClose={onDialogClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="cash-out-title"
    >
      <DialogTitle id="cash-out-title">Cash out</DialogTitle>
      <DialogContent className="flex flex-col gap-3">
        <Typography variant="secondary">
          {summary.paid.count} paid {summary.paid.count === 1 ? "sale" : "sales"} today. Match the card
          machine&apos;s batch total and count the till.
        </Typography>

        <TableContainer>
          <Table size="small" aria-label="Cash out by payment type">
            <TableHead>
              <TableRow>
                <TableCell>Payment type</TableCell>
                <TableCell align="right">Sales</TableCell>
                <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  Subtotal
                </TableCell>
                <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  GST
                </TableCell>
                <TableCell align="right" sx={{ display: { xs: "none", sm: "table-cell" } }}>
                  PST
                </TableCell>
                <TableCell align="right">Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {[...summary.byTender.map((t) => ({ key: t.tender, ...t })), { key: "ALL", ...summary.paid }].map(
                (row) => {
                  const total = row.key === "ALL";
                  const weight = total ? { fontWeight: 600 } : undefined;
                  return (
                    <TableRow key={row.key}>
                      <TableCell sx={weight}>
                        {total ? (
                          "Total"
                        ) : (
                          <div className="flex flex-col">
                            <span>{TENDER_LABEL[row.key as keyof typeof TENDER_LABEL]}</span>
                            <Typography variant="secondary" component="span">
                              {TENDER_WHERE[row.key as keyof typeof TENDER_WHERE]}
                            </Typography>
                          </div>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={weight}>
                        {row.count}
                      </TableCell>
                      <TableCell align="right" sx={{ ...weight, display: { xs: "none", sm: "table-cell" } }}>
                        {formatMoney(row.subtotalCents)}
                      </TableCell>
                      <TableCell align="right" sx={{ ...weight, display: { xs: "none", sm: "table-cell" } }}>
                        {formatMoney(row.gstCents)}
                      </TableCell>
                      <TableCell align="right" sx={{ ...weight, display: { xs: "none", sm: "table-cell" } }}>
                        {formatMoney(row.pstCents)}
                      </TableCell>
                      <TableCell align="right" sx={weight}>
                        {formatMoney(row.totalCents)}
                      </TableCell>
                    </TableRow>
                  );
                },
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {summary.voided.count > 0 ? (
          <Typography variant="secondary">
            {summary.voided.count} voided {summary.voided.count === 1 ? "sale" : "sales"} (
            {formatMoney(summary.voided.totalCents)}) not counted above.
          </Typography>
        ) : null}

        <div className="flex flex-col gap-2">
          <TextField
            size="small"
            label="Cash counted in the till"
            placeholder={formatMoney(cash.totalCents)}
            value={counted}
            onChange={(e) => setCounted(e.target.value)}
            error={counted.trim() !== "" && countedCents === null}
            helperText={
              counted.trim() !== "" && countedCents === null
                ? "Enter an amount, like 412.50."
                : `Cash sales today: ${formatMoney(cash.totalCents)}. Leave out the float.`
            }
            slotProps={{ htmlInput: { inputMode: "decimal", maxLength: 12 } }}
          />
          {difference === null ? null : difference === 0 ? (
            <div className="flex items-center gap-2">
              <StatusPill status="ok" label="Till matches" />
            </div>
          ) : (
            <Alert severity="warning">
              The till is {difference > 0 ? "over" : "short"} by {formatMoney(Math.abs(difference))}.
            </Alert>
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={close}>
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
