"use client";

import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import DisabledReason from "@/components/ui/DisabledReason";
import { formatMoney, isPass } from "../cart";
import type { CartItem, Product, ProductKind } from "../types";

// Tile groups, in the order staff reach for them.
const GROUPS: { kinds: ProductKind[]; title: string }[] = [
  { kinds: ["DAY", "PUNCH"], title: "Day passes and punch cards" },
  { kinds: ["MEMBERSHIP"], title: "Memberships" },
  { kinds: ["RENTAL", "RETAIL"], title: "Rentals and chalk" },
];

// Middle column of the POS: a tile per product. Each press adds one to the
// cart. Disabled until a climber is picked, since every sale is for one.
export default function ProductPanel({
  products,
  cart,
  canAdd,
  onAdd,
}: {
  products: Product[];
  cart: CartItem[];
  canAdd: boolean;
  onAdd: (product: Product) => void;
}) {
  const inCart = new Set(cart.map((i) => i.productId));

  function tile(p: Product) {
    const reason = !canAdd
      ? "Pick a climber first"
      : isPass(p.kind) && inCart.has(p.id)
        ? "Already in the cart"
        : null;
    const button = (
      <Button
        variant="outlined"
        fullWidth
        disabled={reason !== null}
        onClick={() => onAdd(p)}
        // A tile, not a one-line button: as tall as its name and price need.
        sx={{
          height: "auto",
          minHeight: "100%",
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
    );
    return (
      <div key={p.id} className="flex">
        {reason ? (
          <DisabledReason reason={reason} fullWidth>
            {button}
          </DisabledReason>
        ) : (
          button
        )}
      </div>
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
