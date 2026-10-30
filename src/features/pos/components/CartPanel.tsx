"use client";

import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import DisabledReason from "@/components/ui/DisabledReason";
import { MAX_QUANTITY, formatMoney, isPass } from "../cart";
import type { PricedCart } from "../types";

// Right column of the POS: what's being bought, a running subtotal, and the
// Checkout button. Tax is added in the checkout popup.
export default function CartPanel({
  climberName,
  cart,
  warnings,
  onQuantity,
  onClear,
  onCheckout,
}: {
  climberName: string | null;
  cart: PricedCart;
  warnings: string[];
  onQuantity: (productId: string, quantity: number) => void;
  onClear: () => void;
  onCheckout: () => void;
}) {
  const empty = cart.lines.length === 0;
  const checkoutBlocked = !climberName
    ? "Pick a climber first"
    : empty
      ? "Add something to the cart first"
      : null;

  const checkout = (
    <Button
      variant="contained"
      size="large"
      fullWidth
      disabled={checkoutBlocked !== null}
      onClick={onCheckout}
    >
      Checkout
    </Button>
  );

  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <Typography variant="cardTitle">Cart</Typography>
          {climberName ? (
            <Typography variant="secondary" component="span">
              For {climberName}
            </Typography>
          ) : null}
        </div>

        {empty ? (
          <Typography variant="secondary">
            {climberName ? "Add passes, memberships or rentals." : "Pick a climber, then add items."}
          </Typography>
        ) : (
          <ul className="flex flex-col gap-2" aria-label="Items in the cart">
            {cart.lines.map((line) => (
              <li key={line.productId} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <Typography variant="body">{line.name}</Typography>
                  <Typography variant="body" sx={{ whiteSpace: "nowrap" }}>
                    {formatMoney(line.lineTotalCents)}
                  </Typography>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isPass(line.kind) ? null : (
                    <>
                      <Button
                        variant="outlined"
                        size="small"
                        aria-label={`One less ${line.name}`}
                        onClick={() => onQuantity(line.productId, line.quantity - 1)}
                      >
                        −
                      </Button>
                      <Typography variant="body" component="span" aria-label={`Quantity of ${line.name}`}>
                        {line.quantity}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        aria-label={`One more ${line.name}`}
                        disabled={line.quantity >= MAX_QUANTITY}
                        onClick={() => onQuantity(line.productId, line.quantity + 1)}
                      >
                        +
                      </Button>
                      <Typography variant="secondary" component="span">
                        {formatMoney(line.unitPriceCents)} each
                      </Typography>
                    </>
                  )}
                  <Button
                    variant="text"
                    size="small"
                    aria-label={`Remove ${line.name}`}
                    onClick={() => onQuantity(line.productId, 0)}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <Divider />
        <div className="flex items-baseline justify-between gap-2">
          <Typography variant="body" sx={{ fontWeight: 600 }}>
            Subtotal
          </Typography>
          <Typography variant="kpi" component="p" aria-label="Subtotal">
            {formatMoney(cart.subtotalCents)}
          </Typography>
        </div>
        <Typography variant="secondary">Tax is added at checkout: GST, plus PST on rentals and chalk.</Typography>

        {warnings.map((w) => (
          <Alert key={w} severity="warning">
            {w}
          </Alert>
        ))}

        {checkoutBlocked ? (
          <DisabledReason reason={checkoutBlocked} fullWidth>
            {checkout}
          </DisabledReason>
        ) : (
          checkout
        )}
        {empty ? null : (
          <div className="flex justify-center">
            <Button variant="text" size="small" onClick={onClear}>
              Clear cart
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
