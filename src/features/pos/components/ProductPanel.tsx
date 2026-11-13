"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import DisabledReason from "@/components/ui/DisabledReason";
import { MAX_QUANTITY, formatMoney, isPass } from "../cart";
import type { CartItem, Product, ProductKind } from "../types";

// Tile groups, in the order staff reach for them.
const GROUPS: { kinds: ProductKind[]; title: string }[] = [
  { kinds: ["DAY", "PUNCH"], title: "Day passes and punch cards" },
  { kinds: ["MEMBERSHIP"], title: "Memberships" },
  { kinds: ["RENTAL", "RETAIL"], title: "Rentals and chalk" },
];

// Middle column of the POS: a tile per product. Each press adds one to the
// cart; press a pass or membership again to take it out. Rentals and chalk show
// a minus, the count and a plus on the tile itself, and the cart repeats them.
// Disabled until a climber is picked, since every sale is for one.
export default function ProductPanel({
  products,
  cart,
  canAdd,
  onAdd,
  onQuantity,
}: {
  products: Product[];
  cart: CartItem[];
  canAdd: boolean;
  onAdd: (product: Product) => void;
  onQuantity: (productId: string, quantity: number) => void;
}) {
  const quantities = new Map(cart.map((i) => [i.productId, i.quantity]));

  function tile(p: Product) {
    const quantity = quantities.get(p.id) ?? 0;
    const inCart = quantity > 0;
    const single = isPass(p.kind);
    const reason = !canAdd ? "Pick a climber first" : null;
    const button = (
      <Button
        variant="text"
        fullWidth
        disabled={reason !== null}
        aria-pressed={single ? inCart : undefined}
        onClick={() => (single && inCart ? onQuantity(p.id, 0) : onAdd(p))}
        // A tile, not a one-line button: as tall as its name and price need.
        sx={{
          height: "auto",
          flexGrow: 1,
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
          {single && inCart ? " · in the cart, press to remove" : ""}
        </Typography>
      </Button>
    );
    return (
      <Box
        key={p.id}
        className="flex flex-col"
        sx={{
          border: 1,
          borderRadius: 1,
          borderColor: inCart ? "primary.main" : "divider",
          bgcolor: inCart ? "action.selected" : undefined,
        }}
      >
        {reason ? (
          <DisabledReason reason={reason} fullWidth>
            {button}
          </DisabledReason>
        ) : (
          button
        )}
        {inCart && !single ? (
          <div className="flex items-center justify-center gap-2 px-2 pb-2">
            <Button
              variant="outlined"
              size="small"
              aria-label={`One less ${p.name}`}
              onClick={() => onQuantity(p.id, quantity - 1)}
            >
              −
            </Button>
            <Typography variant="body" component="span" aria-label={`Quantity of ${p.name}`}>
              {quantity}
            </Typography>
            <Button
              variant="outlined"
              size="small"
              aria-label={`One more ${p.name}`}
              disabled={quantity >= MAX_QUANTITY}
              onClick={() => onQuantity(p.id, quantity + 1)}
            >
              +
            </Button>
          </div>
        ) : null}
      </Box>
    );
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <Typography variant="cardTitle">Add to cart</Typography>
        {products.length === 0 ? (
          <Typography variant="secondary">Nothing is for sale yet. Run the seed to add products.</Typography>
        ) : null}
        {GROUPS.map((group) => {
          const items = products.filter((p) => group.kinds.includes(p.kind));
          if (items.length === 0) return null;
          return (
            <section key={group.title} className="flex flex-col gap-2" aria-label={group.title}>
              <Typography variant="secondary" component="h3">
                {group.title}
              </Typography>
              <div className="grid grid-cols-2 gap-2">{items.map(tile)}</div>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}
