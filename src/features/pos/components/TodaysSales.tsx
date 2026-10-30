"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
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
import { useState, useTransition } from "react";
import DisabledReason from "@/components/ui/DisabledReason";
import StatusPill from "@/components/ui/StatusPill";
import { voidSale } from "../actions";
import { formatMoney } from "../cart";
import type { SaleSummary } from "../types";
import { useDeskDialogOpen } from "@/features/check-ins/desk-dialogs";

const TENDER_LABEL = { CARD: "Card", CASH: "Cash", ONLINE: "Online" } as const;

// Today's sales under the POS, newest first, with Void. Totals count paid
// sales only, so they match what the card machine and till should hold.
export default function TodaysSales({ sales }: { sales: SaleSummary[] }) {
  const [voiding, setVoiding] = useState<SaleSummary | null>(null);
  // Hold the scan popup while voiding (#92, #127).
  useDeskDialogOpen(voiding !== null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const paid = sales.filter((s) => s.status === "PAID");
  const totals = (["CARD", "CASH", "ONLINE"] as const).map((t) => ({
    tender: t,
    cents: paid.filter((s) => s.tender === t).reduce((sum, s) => sum + s.totalCents, 0),
  }));

  function close() {
    if (pending) return;
    setVoiding(null);
    setReason("");
    setError(null);
  }

  function confirmVoid(sale: SaleSummary) {
    setError(null);
    startTransition(async () => {
      const result = await voidSale(sale.id, reason);
      if (result.ok) {
        setVoiding(null);
        setReason("");
      } else {
        setError(result.message ?? "Couldn't void the sale. Try again.");
      }
    });
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Typography variant="cardTitle">Today&apos;s sales</Typography>
          <Typography variant="secondary" component="span">
            {paid.length} paid · {totals.map((t) => `${TENDER_LABEL[t.tender]} ${formatMoney(t.cents)}`).join(" · ")}
          </Typography>
        </div>

        {sales.length === 0 ? (
          <Typography variant="secondary">No sales yet today.</Typography>
        ) : (
          <TableContainer>
            <Table size="small" aria-label="Today's sales">
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Climber</TableCell>
                  <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>Items</TableCell>
                  <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>Paid by</TableCell>
                  <TableCell align="right">Total</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>
                    <span className="sr-only">Actions</span>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sales.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{s.time}</TableCell>
                    <TableCell>{s.climberName}</TableCell>
                    <TableCell sx={{ display: { xs: "none", md: "table-cell" } }}>{s.items}</TableCell>
                    <TableCell sx={{ display: { xs: "none", sm: "table-cell" } }}>
                      {TENDER_LABEL[s.tender]}
                    </TableCell>
                    <TableCell align="right">{formatMoney(s.totalCents)}</TableCell>
                    <TableCell>
                      {s.status === "PAID" ? (
                        <StatusPill status="ok" label="Paid" />
                      ) : (
                        <div className="flex flex-col items-start gap-1">
                          <StatusPill status="neutral" label="Voided" />
                          {s.voidReason ? <Typography variant="secondary">{s.voidReason}</Typography> : null}
                        </div>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {s.status === "PAID" ? (
                        <Button
                          variant="outlined"
                          size="small"
                          aria-label={`Void ${s.climberName}'s sale of ${formatMoney(s.totalCents)}`}
                          onClick={() => setVoiding(s)}
                        >
                          Void
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>

      <Dialog open={voiding !== null} onClose={close} fullWidth maxWidth="xs" aria-labelledby="void-title">
        <DialogTitle id="void-title">Void sale</DialogTitle>
        {voiding ? (
          <>
            <DialogContent className="flex flex-col gap-3">
              <Typography variant="body">
                Void {voiding.climberName}&apos;s sale of {formatMoney(voiding.totalCents)} ({voiding.items})?
              </Typography>
              <Typography variant="secondary">
                Passes from this sale stop working now. Give the money back on the card machine or from the till.
              </Typography>
              <TextField
                autoFocus
                fullWidth
                size="small"
                label="Reason"
                placeholder="Rang up the wrong membership"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                slotProps={{ htmlInput: { maxLength: 200 } }}
              />
              {error ? <Alert severity="error">{error}</Alert> : null}
            </DialogContent>
            <DialogActions>
              <Button disabled={pending} onClick={close}>
                Keep sale
              </Button>
              {reason.trim() === "" ? (
                <DisabledReason reason="Give a reason first">
                  <Button variant="contained" disabled>
                    Void sale
                  </Button>
                </DisabledReason>
              ) : (
                <Button variant="contained" disabled={pending} onClick={() => confirmVoid(voiding)}>
                  {pending ? "Voiding…" : "Void sale"}
                </Button>
              )}
            </DialogActions>
          </>
        ) : null}
      </Dialog>
    </Card>
  );
}
