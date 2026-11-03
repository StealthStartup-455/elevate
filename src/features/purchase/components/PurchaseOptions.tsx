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
import DisabledReason from "@/components/ui/DisabledReason";
import { formatMoney, formatRate, isPass, MAX_QUANTITY, priceCart } from "@/features/pos/cart";
import { newKey } from "@/features/pos/key";
import type { SaleResult } from "@/features/pos/sale";
import type { CartItem, Product, ProductKind, TaxRates } from "@/features/pos/types";
import { buyOnline } from "../actions";
import {
  ACTIVE_MEMBERSHIP_NOTICE,
  choosePass,
  purchaseWarnings,
  setGoodsQuantity,
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

// A tile that adds a membership or pass to the order, or takes it out again.
// As tall as its name and price need, not a one-line button.
function Tile({
  product,
  selected,
  onPick,
}: {
  product: Product;
  selected: boolean;
  onPick: (p: Product) => void;
}) {
  return (
    <Button
      variant="outlined"
      fullWidth
      aria-pressed={selected}
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
        ...(selected ? { borderColor: "primary.main", bgcolor: "primary.softHover" } : {}),
      }}
    >
      <span>
        {selected ? <span aria-hidden="true">✓ </span> : null}
        {product.name}
      </span>
      <Typography variant="secondary" component="span">
        {formatMoney(product.priceCents)}
        {product.recurring ? " a month" : ""}
        {selected ? " · in your order" : ""}
      </Typography>
    </Button>
  );
}

// A rental or chalk line: its price and how many are in the order.
function GoodsRow({
  product,
  quantity,
  onChange,
}: {
  product: Product;
  quantity: number;
  onChange: (p: Product, quantity: number) => void;
}) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2">
      <div>
        <Typography variant="body">{product.name}</Typography>
        <Typography variant="secondary">{formatMoney(product.priceCents)} each</Typography>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="outlined"
          size="small"
          aria-label={`One fewer ${product.name}`}
          disabled={quantity <= 0}
          onClick={() => onChange(product, quantity - 1)}
        >
          −
        </Button>
        <Typography variant="body" component="span" aria-live="polite" sx={{ minWidth: 24, textAlign: "center" }}>
          {quantity}
        </Typography>
        <Button
          variant="outlined"
          size="small"
          aria-label={`One more ${product.name}`}
          disabled={quantity >= MAX_QUANTITY}
          onClick={() => onChange(product, quantity + 1)}
        >
          +
        </Button>
      </div>
    </li>
  );
}

// The climber's side of the desk POS. One order: any number of rentals and
// chalk, and at most one membership, day pass or punch card (#143). Memberships
// (with the day pass and punch card) sit in an expandable Membership section
// that only climbers without an active membership get; everyone can buy rentals
// and chalk. "Checkout" opens a popup with the full sum, GST and PST. Nothing is
// charged yet: it is a mock until real payments (#31).
export default function PurchaseOptions({
  products,
  rates,
  context,
}: {
  products: Product[];
  rates: TaxRates;
  context: PurchaseContext;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);
  const [key, setKey] = useState(newKey);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Extract<SaleResult, { ok: true }> | null>(null);
  const [pending, startTransition] = useTransition();

  const passes = products.filter((p) => isPass(p.kind));
  const goods = products.filter((p) => !isPass(p.kind));
  const showMembership = showsMembershipSection(context.membershipStatus);
  const quantityOf = (id: string) => cart.find((i) => i.productId === id)?.quantity ?? 0;

  // Any change makes a different order, so it gets its own key: the same key
  // would give back the earlier purchase.
  function update(next: CartItem[]) {
    setCart(next);
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
        setCart([]);
        setKey(newKey());
      }
    }, 200);
  }

  function pay() {
    if (cart.length === 0) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await buyOnline({ items: cart, idempotencyKey: key });
        if (result.ok) setDone(result);
        else setError(result.message);
      } catch {
        // Same key on the retry, so a purchase that did save isn't saved twice.
        setError("Couldn't reach the server. Check your connection and try again.");
      }
    });
  }

  const priced = priceCart(cart, products, rates);
  const kinds = new Set(priced.lines.map((l) => l.kind));
  const warnings = [...new Set([...kinds].flatMap((kind) => purchaseWarnings(kind, context)))];
  const pickup = kinds.has("RENTAL") || kinds.has("RETAIL");

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
            ) : (
              <Typography variant="secondary">One membership or pass per order. Picking another replaces it.</Typography>
            )}
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
                        <Tile
                          product={p}
                          selected={quantityOf(p.id) > 0}
                          onPick={(picked) => update(choosePass(cart, picked, products))}
                        />
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
            <ul className="flex flex-col gap-3" aria-label="Rentals and chalk">
              {goods.map((p) => (
                <GoodsRow
                  key={p.id}
                  product={p}
                  quantity={quantityOf(p.id)}
                  onChange={(product, quantity) => update(setGoodsQuantity(cart, product, quantity))}
                />
              ))}
            </ul>
          )}
          <Typography variant="secondary">
            Add as many as you need, for a friend or the kids. Pay here, pick it up at the front desk. Prices are
            before tax: GST, plus PST on rentals and chalk.
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <Typography variant="cardTitle" component="h2">
            Your order
          </Typography>
          {priced.lines.length === 0 ? (
            <Typography variant="secondary">
              Nothing yet. Add rentals or chalk{showMembership ? ", or pick a membership" : ""}.
            </Typography>
          ) : (
            <>
              <ul className="flex flex-col gap-1" aria-label="Your order">
                {priced.lines.map((line) => (
                  <li key={line.productId} className="flex items-baseline justify-between gap-2">
                    <Typography variant="body">
                      {line.name}
                      {line.quantity > 1 ? ` ×${line.quantity}` : ""}
                    </Typography>
                    <Typography variant="body">{formatMoney(line.lineTotalCents)}</Typography>
                  </li>
                ))}
              </ul>
              <Row label="Subtotal" value={formatMoney(priced.subtotalCents)} />
            </>
          )}
          <div className="flex justify-end">
            {priced.lines.length === 0 ? (
              <DisabledReason reason="Add something to your order first">
                <Button variant="contained" disabled>
                  Checkout
                </Button>
              </DisabledReason>
            ) : (
              <Button variant="contained" onClick={() => setOpen(true)}>
                Checkout
              </Button>
            )}
          </div>
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
                <ul className="flex flex-col gap-1" aria-label="Order paid">
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
              <ul className="flex flex-col gap-1" aria-label="Items">
                {priced.lines.map((line) => (
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
              <Row label="Subtotal" value={formatMoney(priced.subtotalCents)} />
              <Row label={`GST (${formatRate(priced.gstRateBps)})`} value={formatMoney(priced.gstCents)} />
              {priced.pstCents > 0 ? (
                <Row label={`PST (${formatRate(priced.pstRateBps)})`} value={formatMoney(priced.pstCents)} />
              ) : null}
              <Row label="Total" value={formatMoney(priced.totalCents)} strong />
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
              <Button variant="contained" disabled={pending || cart.length === 0} onClick={pay}>
                {pending ? "Paying…" : `Pay ${formatMoney(priced.totalCents)}`}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
