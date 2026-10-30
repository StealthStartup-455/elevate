"use client";

import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
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
import { formatMoney, formatRate, isPass, MAX_QUANTITY, priceCart } from "@/features/pos/cart";
import { newKey } from "@/features/pos/key";
import type { SaleResult } from "@/features/pos/sale";
import type { Product, ProductKind } from "@/features/pos/types";
import { buyOnline } from "../actions";
import {
  ACTIVE_MEMBERSHIP_NOTICE,
  purchaseWarnings,
  showsMembershipSection,
  type PurchaseContext,
} from "../catalog";

// Tile groups inside the Membership section, in the order a climber looks for them.
const PASS_GROUPS: { kinds: ProductKind[]; title: string }[] = [
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

// A tile, not a one-line button: as tall as its name and price need.
function Tile({ product, onPick }: { product: Product; onPick: (p: Product) => void }) {
  return (
    <Button
      variant="outlined"
      fullWidth
      onClick={() => onPick(product)}
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
      <span>{product.name}</span>
      <Typography variant="secondary" component="span">
        {formatMoney(product.priceCents)}
        {product.recurring ? " a month" : ""}
      </Typography>
    </Button>
  );
}

// The climber's side of the desk POS, one product at a time. Memberships (with
// the day pass and punch card) sit in an expandable Membership section that
// only climbers without an active membership get; everyone can buy rentals and
// chalk. Picking a product opens the checkout popup with the full sum and GST.
// Nothing is charged yet: it is a mock until real payments (#31).
export default function PurchaseOptions({
  products,
  taxRateBps,
  context,
}: {
  products: Product[];
  taxRateBps: number;
  context: PurchaseContext;
}) {
  const [picked, setPicked] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(newKey);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Extract<SaleResult, { ok: true }> | null>(null);
  const [pending, startTransition] = useTransition();

  const passes = products.filter((p) => isPass(p.kind));
  const goods = products.filter((p) => !isPass(p.kind));
  const showMembership = showsMembershipSection(context.membershipStatus);

  function choose(product: Product) {
    // A different product is a different checkout, so it gets its own key.
    if (picked?.id !== product.id) {
      setKey(newKey());
      setQuantity(1);
    }
    setPicked(product);
    setError(null);
    setOpen(true);
  }

  function changeQuantity(next: number) {
    // A new count is a different order, so a new key: the same key would give
    // back the earlier one.
    setQuantity(Math.min(Math.max(next, 1), MAX_QUANTITY));
    setKey(newKey());
  }

  function close() {
    // Not while paying. After a saved purchase it's fine, even though the page
    // behind is still refreshing (which keeps `pending` on a moment longer).
    if (pending && !done) return;
    setOpen(false);
    // After the closing animation, so nothing flashes. Cancel keeps the key:
    // if a payment did reach the server, trying again returns that purchase.
    setTimeout(() => {
      setError(null);
      if (done) {
        setDone(null);
        setPicked(null);
        setQuantity(1);
        setKey(newKey());
      }
    }, 200);
  }

  function pay() {
    if (!picked) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await buyOnline({ productId: picked.id, quantity, idempotencyKey: key });
        if (result.ok) setDone(result);
        else setError(result.message);
      } catch {
        // Same key on the retry, so a purchase that did save isn't saved twice.
        setError("Couldn't reach the server. Check your connection and try again.");
      }
    });
  }

  const cart = picked ? priceCart([{ productId: picked.id, quantity }], products, taxRateBps) : null;
  const warnings = picked ? purchaseWarnings(picked.kind, context) : [];
  const countable = picked ? !isPass(picked.kind) : false;
  const pickup = picked?.kind === "RENTAL" || picked?.kind === "RETAIL";

  return (
    <>
      {!showMembership ? <Alert severity="warning">{ACTIVE_MEMBERSHIP_NOTICE}</Alert> : null}

      {showMembership ? (
        <Accordion defaultExpanded>
          <AccordionSummary
            expandIcon={<span aria-hidden="true">▾</span>}
            aria-controls="membership-section"
            id="membership-heading"
          >
            <Typography variant="cardTitle" component="h2">
              Membership
            </Typography>
          </AccordionSummary>
          <AccordionDetails id="membership-section" className="flex flex-col gap-3">
            {passes.length === 0 ? (
              <Typography variant="secondary">No memberships are for sale yet. Ask at the front desk.</Typography>
            ) : null}
            {PASS_GROUPS.map((group) => {
              const items = passes.filter((p) => group.kinds.includes(p.kind));
              if (items.length === 0) return null;
              return (
                <section key={group.title} className="flex flex-col gap-2" aria-label={group.title}>
                  <Typography variant="secondary" component="h3">
                    {group.title}
                  </Typography>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {items.map((p) => (
                      <div key={p.id} className="flex">
                        <Tile product={p} onPick={choose} />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </AccordionDetails>
        </Accordion>
      ) : null}

      <Card>
        <CardContent className="flex flex-col gap-3">
          <Typography variant="cardTitle" component="h2">
            Rentals and chalk
          </Typography>
          {goods.length === 0 ? (
            <Typography variant="secondary">Nothing is for sale here yet. Ask at the front desk.</Typography>
          ) : (
            <section className="grid grid-cols-1 gap-2 sm:grid-cols-2" aria-label="Rentals and chalk">
              {goods.map((p) => (
                <div key={p.id} className="flex">
                  <Tile product={p} onPick={choose} />
                </div>
              ))}
            </section>
          )}
          <Typography variant="secondary">Pay here, pick it up at the front desk. Prices are before tax.</Typography>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={close} fullWidth maxWidth="xs" aria-labelledby="buy-title">
        <DialogTitle id="buy-title">{done ? "You're all set" : "Checkout"}</DialogTitle>
        {done ? (
          <>
            <DialogContent className="flex flex-col gap-3">
              <Alert severity="success">{formatMoney(done.totalCents)} paid. Thanks for climbing with us.</Alert>
              <div>
                <Typography variant="secondary">Your order</Typography>
                <ul className="flex flex-col gap-1" aria-label="Your order">
                  {done.added.map((line) => (
                    <li key={line}>
                      <Typography variant="body">{line}</Typography>
                    </li>
                  ))}
                </ul>
              </div>
              {pickup ? <Alert severity="info">Pick it up at the front desk when you arrive.</Alert> : null}
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
                        <Typography variant="body">
                          {line.name}
                          {line.quantity > 1 ? ` ×${line.quantity}` : ""}
                        </Typography>
                        <Typography variant="body">{formatMoney(line.lineTotalCents)}</Typography>
                      </li>
                    ))}
                  </ul>
                  {countable && picked ? (
                    <div className="flex items-center gap-2">
                      <Typography variant="secondary">Quantity</Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        aria-label={`One fewer ${picked.name}`}
                        disabled={pending || quantity <= 1}
                        onClick={() => changeQuantity(quantity - 1)}
                      >
                        −
                      </Button>
                      <Typography variant="body" aria-live="polite">
                        {quantity}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        aria-label={`One more ${picked.name}`}
                        disabled={pending || quantity >= MAX_QUANTITY}
                        onClick={() => changeQuantity(quantity + 1)}
                      >
                        +
                      </Button>
                    </div>
                  ) : null}
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
              {pickup ? <Alert severity="info">Pay here, then pick it up at the front desk.</Alert> : null}
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
    </>
  );
}
