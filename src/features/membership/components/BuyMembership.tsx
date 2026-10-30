"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { useState, useTransition } from "react";
import { formatMoney, formatRate, priceCart } from "@/features/pos/cart";
import { newKey } from "@/features/pos/key";
import type { SaleResult } from "@/features/pos/sale";
import type { Product, ProductKind } from "@/features/pos/types";
import { buyOnline } from "../actions";
import { purchaseWarnings, type PurchaseContext } from "../catalog";

// Tile groups, in the order a climber looks for them.
const GROUPS: { kinds: ProductKind[]; title: string }[] = [
  { kinds: ["MEMBERSHIP"], title: "Memberships" },
  { kinds: ["DAY", "PUNCH"], title: "Day passes and punch cards" },
];

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

// The climber's side of the purchase: the same passes and memberships as the
// desk POS (minus rentals and chalk, which are handed over at the desk), one
// at a time. Picking one opens the checkout popup with the full sum and GST.
// Nothing is charged yet: it is a mock until real payments (#31).
export default function BuyMembership({
  products,
  taxRateBps,
  context,
}: {
  products: Product[];
  taxRateBps: number;
  context: PurchaseContext;
}) {
  const [picked, setPicked] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(newKey);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Extract<SaleResult, { ok: true }> | null>(null);
  const [pending, startTransition] = useTransition();

  function choose(product: Product) {
    // A different product is a different checkout, so it gets its own key.
    if (picked?.id !== product.id) setKey(newKey());
    setPicked(product);
    setError(null);
    setOpen(true);
  }

  function close() {
    if (pending) return;
    setOpen(false);
    // After the closing animation, so nothing flashes. Cancel keeps the key:
    // if a payment did reach the server, trying again returns that purchase.
    setTimeout(() => {
      setError(null);
      if (done) {
        setDone(null);
        setPicked(null);
        setKey(newKey());
      }
    }, 200);
  }

  function pay() {
    if (!picked) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await buyOnline({ productId: picked.id, idempotencyKey: key });
        if (result.ok) setDone(result);
        else setError(result.message);
      } catch {
        // Same key on the retry, so a purchase that did save isn't saved twice.
        setError("Couldn't reach the server. Check your connection and try again.");
      }
    });
  }

  const cart = picked ? priceCart([{ productId: picked.id, quantity: 1 }], products, taxRateBps) : null;
  const warnings = picked ? purchaseWarnings(picked.kind, context) : [];

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <Typography variant="cardTitle">Buy a pass or membership</Typography>
        {products.length === 0 ? (
          <Typography variant="secondary">Nothing is for sale yet. Ask at the front desk.</Typography>
        ) : null}
        {GROUPS.map((group) => {
          const items = products.filter((p) => group.kinds.includes(p.kind));
          if (items.length === 0) return null;
          return (
            <section key={group.title} className="flex flex-col gap-2" aria-label={group.title}>
              <Typography variant="secondary" component="h3">
                {group.title}
              </Typography>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {items.map((p) => (
                  <Button
                    key={p.id}
                    variant="outlined"
                    onClick={() => choose(p)}
                    // A tile, not a one-line button: as tall as its name and price need.
                    sx={{
                      height: "auto",
                      flexDirection: "column",
                      alignItems: "flex-start",
                      gap: 0.5,
                      py: 2,
                      textAlign: "left",
                      whiteSpace: "normal",
                      lineHeight: 1.3,
                    }}
                  >
                    <span>{p.name}</span>
                    <Typography variant="secondary" component="span">
                      {formatMoney(p.priceCents)}
                      {p.recurring ? " a month" : ""}
                    </Typography>
                  </Button>
                ))}
              </div>
            </section>
          );
        })}
        <Typography variant="secondary">Prices are before tax.</Typography>
      </CardContent>

      <Dialog open={open} onClose={close} fullWidth maxWidth="xs" aria-labelledby="buy-title">
        <DialogTitle id="buy-title">{done ? "You're all set" : "Checkout"}</DialogTitle>
        {done ? (
          <>
            <DialogContent className="flex flex-col gap-3">
              <Alert severity="success">{formatMoney(done.totalCents)} paid. Thanks for climbing with us.</Alert>
              <div>
                <Typography variant="secondary">Added to your account</Typography>
                <ul className="flex flex-col gap-1" aria-label="Added to your account">
                  {done.added.map((line) => (
                    <li key={line}>
                      <Typography variant="body">{line}</Typography>
                    </li>
                  ))}
                </ul>
              </div>
            </DialogContent>
            <DialogActions>
              <Button variant="contained" onClick={close}>
                Done
              </Button>
            </DialogActions>
          </>
        ) : (
          <>
            <DialogContent className="flex flex-col gap-3">
              {cart ? (
                <>
                  <ul className="flex flex-col gap-1" aria-label="Items">
                    {cart.lines.map((line) => (
                      <li key={line.productId} className="flex items-baseline justify-between gap-2">
                        <Typography variant="body">{line.name}</Typography>
                        <Typography variant="body">{formatMoney(line.lineTotalCents)}</Typography>
                      </li>
                    ))}
                  </ul>
                  <Divider />
                  <Row label="Subtotal" value={formatMoney(cart.subtotalCents)} />
                  <Row label={`GST (${formatRate(cart.taxRateBps)})`} value={formatMoney(cart.taxCents)} />
                  <Row label="Total" value={formatMoney(cart.totalCents)} strong />
                </>
              ) : null}
              {warnings.map((w) => (
                <Alert key={w} severity="warning">
                  {w}
                </Alert>
              ))}
              <Alert severity="info">
                This is a demo checkout. Nothing is charged and no card details are asked for.
              </Alert>
              {error ? <Alert severity="error">{error}</Alert> : null}
            </DialogContent>
            <DialogActions>
              <Button disabled={pending} onClick={close}>
                Cancel
              </Button>
              <Button variant="contained" disabled={pending || !cart} onClick={pay}>
                {pending ? "Paying…" : cart ? `Pay ${formatMoney(cart.totalCents)}` : "Pay"}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Card>
  );
}
