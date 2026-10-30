"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";
import { checkInClimber } from "@/features/climbers/actions";
import { recordSale, type SaleResult } from "../actions";
import { formatMoney, formatRate } from "../cart";
import { newKey } from "../key";
import type { CartItem, PricedCart, Tender } from "../types";

const TENDER_LABEL: Record<Tender, string> = { CARD: "card", CASH: "cash", ONLINE: "online" };

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
// saves the sale once the card machine (or the till) has the money. Then a
// summary of what was added, with Check in now and New sale.
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
  /** After Tender or Check in now: reload the climber's passes. */
  onSaved: () => void;
  /** After a saved sale: clear the cart and start again. */
  onFinished: () => void;
}) {
  const [tender, setTender] = useState<Tender>("CARD");
  const [key, setKey] = useState(newKey);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Extract<SaleResult, { ok: true }> | null>(null);
  const [checkIn, setCheckIn] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setTender("CARD");
    setKey(newKey());
    setError(null);
    setDone(null);
    setCheckIn(null);
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

  function checkInNow() {
    startTransition(async () => {
      const result = await checkInClimber(climber.id);
      if (result.ok) onSaved();
      setCheckIn(
        result.ok
          ? { ok: true, message: `${climber.name} is checked in.` }
          : { ok: false, message: result.message ?? "Couldn't check in." },
      );
    });
  }

  const total = formatMoney(cart.totalCents);

  return (
    <Dialog open={open} onClose={close} fullWidth maxWidth="xs" aria-labelledby="checkout-title">
      <DialogTitle id="checkout-title">{done ? "Sale saved" : "Checkout"}</DialogTitle>

      {done ? (
        <>
          <DialogContent className="flex flex-col gap-3">
            <Alert severity="success">
              {formatMoney(done.totalCents)} paid by {TENDER_LABEL[done.tender]} for {climber.name}.
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
            {checkIn ? (
              <Alert severity={checkIn.ok ? "success" : "warning"}>{checkIn.message}</Alert>
            ) : null}
          </DialogContent>
          <DialogActions>
            {checkIn?.ok ? null : (
              <Button variant="outlined" disabled={pending} onClick={checkInNow}>
                Check in now
              </Button>
            )}
            <Button variant="contained" disabled={pending} onClick={close}>
              New sale
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
                value={tender}
                onChange={(_, v: Tender | null) => v && setTender(v)}
                aria-labelledby="tender-label"
              >
                <ToggleButton value="CARD">Card</ToggleButton>
                <ToggleButton value="CASH">Cash</ToggleButton>
              </ToggleButtonGroup>
            </div>
            <Alert severity="info">
              {tender === "CARD"
                ? `Run ${total} on the card machine. Press Tender once it's approved.`
                : `Take ${total} in cash. Press Tender once it's in the till.`}
            </Alert>
            {error ? <Alert severity="error">{error}</Alert> : null}
          </DialogContent>
          <DialogActions>
            <Button disabled={pending} onClick={close}>
              Cancel
            </Button>
            <Button variant="contained" disabled={pending} onClick={tenderSale}>
              {pending ? "Saving…" : "Tender"}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
