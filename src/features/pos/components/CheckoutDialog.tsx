"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";
import { recordSale, type SaleResult } from "../actions";
import { formatMoney, formatRate } from "../cart";
import { addBill, cashRounding, cashTendered, QUICK_BILLS_CENTS, roundCash } from "../cash";
import { parseDollars } from "../cashout";
import { newKey } from "../key";
import type { CartItem, PricedCart, Tender } from "../types";
import DisabledReason from "@/components/ui/DisabledReason";
import { useBackdropClose } from "@/components/ui/useBackdropClose";
import { useDeskDialogOpen } from "@/features/check-ins/desk-dialogs";

const TENDER_LABEL: Record<Tender, string> = { CARD: "card", CASH: "cash", ONLINE: "online" };

/** −2 → "−$0.02", 3 → "+$0.03". */
function signedMoney(cents: number): string {
  return `${cents < 0 ? "−" : "+"}${formatMoney(Math.abs(cents))}`;
}

/** The ✓ on the picked payment, so it doesn't rely on color alone. */
function picked(on: boolean) {
  return on ? (
    <span className="pr-1" aria-hidden="true">
      ✓
    </span>
  ) : null;
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <Typography variant={strong ? "body" : "secondary"} sx={strong ? { fontWeight: 600 } : undefined}>
        {label}
      </Typography>
      <Typography variant={strong ? "kpi" : "body"} component="p">
        {value}
      </Typography>
    </div>
  );
}

// The checkout popup: the full sum with GST and PST, how they paid, and Tender, which
// saves the sale once the card machine (or the till) has the money. Cash is rounded
// to 5 cents (no pennies), and staff type the cash handed over to see the change
// (#250). Then a summary of what was added, with Back to POS.
export default function CheckoutDialog({
  open,
  climber,
  items,
  cart,
  onClose,
  onSaved,
  onFinished,
}: {
  open: boolean;
  climber: { id: string; name: string };
  items: CartItem[];
  cart: PricedCart;
  onClose: () => void;
  /** After Tender: reload the climber's passes. */
  onSaved: () => void;
  /** After a saved sale: clear the cart and start again. */
  onFinished: () => void;
}) {
  // Hold the scan popup while checking out (#92, #127).
  useDeskDialogOpen(open);
  const [tender, setTender] = useState<Tender>("CARD");
  const [received, setReceived] = useState("");
  // The change worked out when Tender was pressed, so later edits can't change it.
  const [changeGiven, setChangeGiven] = useState<number | null>(null);
  const [key, setKey] = useState(newKey);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Extract<SaleResult, { ok: true }> | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTender("CARD");
    setChangeGiven(null);
    setReceived("");
    setKey(newKey());
    setError(null);
    setDone(null);
  }

  function close() {
    if (pending) return;
    const finished = done !== null;
    onClose();
    // After the closing animation, so nothing flashes. Cancel keeps the key:
    // if a Tender did reach the server, trying again returns that sale.
    setTimeout(() => {
      setError(null);
      if (!finished) return;
      reset();
      onFinished();
    }, 200);
  }

  function tenderSale() {
    setError(null);
    setChangeGiven(cash && tendered.status === "paid" ? tendered.changeCents : null);
    startTransition(async () => {
      try {
        const result = await recordSale({ climberId: climber.id, items, tender, idempotencyKey: key });
        if (result.ok) {
          setDone(result);
          onSaved();
        } else setError(result.message);
      } catch {
        // Same key on the retry, so a sale that did save isn't saved twice.
        setError("Couldn't reach the server. Check the connection and press Tender again.");
      }
    });
  }

  // Outside clicks close it too, but not the second click of a double-click (#134, #218).
  const onDialogClose = useBackdropClose(open, close);

  const total = formatMoney(cart.totalCents);
  const cash = tender === "CASH";
  const cashDueCents = roundCash(cart.totalCents);
  const roundingCents = cashRounding(cart.totalCents);
  const receivedCents = parseDollars(received);
  const tendered = cashTendered(received, receivedCents, cashDueCents);
  // Cash can't be tendered until what was handed over covers the rounded total.
  const tenderBlocked =
    !cash || tendered.status === "paid"
      ? null
      : tendered.status === "short"
        ? `${formatMoney(tendered.shortCents)} more cash is needed`
        : "Enter the cash received first";
  const doneCents = done ? (done.tender === "CASH" ? roundCash(done.totalCents) : done.totalCents) : 0;

  return (
    <Dialog open={open} onClose={onDialogClose} fullWidth maxWidth="xs" aria-labelledby="checkout-title">
      <DialogTitle id="checkout-title">{done ? "Sale saved" : "Checkout"}</DialogTitle>

      {done ? (
        <>
          <DialogContent className="flex flex-col gap-3">
            <Alert severity="success">
              {formatMoney(doneCents)} paid by {TENDER_LABEL[done.tender]} for {climber.name}.
              {done.tender === "CASH" && changeGiven !== null && changeGiven > 0
                ? ` Give back ${formatMoney(changeGiven)} in change.`
                : ""}
            </Alert>
            <div>
              <Typography variant="secondary">Added to their account</Typography>
              <ul className="flex flex-col gap-1" aria-label="Added to their account">
                {done.added.map((line) => (
                  <li key={line}>
                    <Typography variant="body">{line}</Typography>
                  </li>
                ))}
              </ul>
            </div>
          </DialogContent>
          <DialogActions>
            <Button variant="contained" disabled={pending} onClick={close}>
              Back to POS
            </Button>
          </DialogActions>
        </>
      ) : (
        <>
          <DialogContent className="flex flex-col gap-3">
            <Typography variant="secondary">For {climber.name}</Typography>
            <ul className="flex flex-col gap-1" aria-label="Items">
              {cart.lines.map((line) => (
                <li key={line.productId} className="flex items-baseline justify-between gap-2">
                  <Typography variant="body">
                    {line.name}
                    {line.quantity > 1 ? ` ×${line.quantity}` : ""}
                  </Typography>
                  <Typography variant="body">{formatMoney(line.lineTotalCents)}</Typography>
                </li>
              ))}
            </ul>
            <Divider />
            <Row label="Subtotal" value={formatMoney(cart.subtotalCents)} />
            <Row label={`GST (${formatRate(cart.gstRateBps)})`} value={formatMoney(cart.gstCents)} />
            {cart.pstCents > 0 ? (
              <Row label={`PST (${formatRate(cart.pstRateBps)})`} value={formatMoney(cart.pstCents)} />
            ) : null}
            <Row label="Total" value={total} strong />

            <div className="flex flex-col gap-1">
              <Typography variant="secondary" id="tender-label">
                Paid by
              </Typography>
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="large"
                value={tender}
                disabled={pending}
                onChange={(_, v: Tender | null) => v && setTender(v)}
                aria-labelledby="tender-label"
              >
                <ToggleButton value="CARD">{picked(tender === "CARD")}Card</ToggleButton>
                <ToggleButton value="CASH">{picked(tender === "CASH")}Cash</ToggleButton>
              </ToggleButtonGroup>
            </div>
            {cash ? (
              <div className="flex flex-col gap-2">
                {roundingCents !== 0 ? <Row label="Cash rounding" value={signedMoney(roundingCents)} /> : null}
                <Row label="Cash total" value={formatMoney(cashDueCents)} strong />
                <TextField
                  size="small"
                  label="Cash received"
                  placeholder={formatMoney(cashDueCents)}
                  value={received}
                  disabled={pending}
                  onChange={(e) => setReceived(e.target.value)}
                  error={tendered.status === "invalid"}
                  helperText={tendered.status === "invalid" ? "Enter an amount, like 20 or 17.90." : undefined}
                  slotProps={{ htmlInput: { inputMode: "decimal", maxLength: 12 } }}
                />
                <div className="flex flex-wrap gap-2" role="group" aria-label="Quick cash amounts">
                  <Button
                    size="small"
                    variant="outlined"
                    disabled={pending}
                    onClick={() => setReceived((cashDueCents / 100).toFixed(2))}
                  >
                    Exact
                  </Button>
                  {QUICK_BILLS_CENTS.map((bill) => (
                    <Button
                      key={bill}
                      size="small"
                      variant="outlined"
                      disabled={pending}
                      onClick={() => setReceived(addBill(receivedCents, bill))}
                    >
                      +{formatMoney(bill).replace(/\.00$/, "")}
                    </Button>
                  ))}
                  {received ? (
                    <Button size="small" variant="text" disabled={pending} onClick={() => setReceived("")}>
                      Clear
                    </Button>
                  ) : null}
                </div>
                {tendered.status === "paid" ? (
                  <Row label="Change owed" value={formatMoney(tendered.changeCents)} strong />
                ) : tendered.status === "short" ? (
                  <Alert severity="warning">Still owed: {formatMoney(tendered.shortCents)}.</Alert>
                ) : null}
              </div>
            ) : null}
            <Alert severity="info">
              {cash
                ? `Take ${formatMoney(cashDueCents)} in cash and give back the change. Press Tender once it's in the till.`
                : `Run ${total} on the card machine. Press Tender once it's approved.`}
            </Alert>
            {error ? <Alert severity="error">{error}</Alert> : null}
          </DialogContent>
          <DialogActions>
            <Button disabled={pending} onClick={close}>
              Cancel
            </Button>
            {tenderBlocked ? (
              <DisabledReason reason={tenderBlocked}>
                <Button variant="contained" disabled>
                  Tender
                </Button>
              </DisabledReason>
            ) : (
              <Button variant="contained" disabled={pending} onClick={tenderSale}>
                {pending ? "Saving…" : "Tender"}
              </Button>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
