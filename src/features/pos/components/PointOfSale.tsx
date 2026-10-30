"use client";

import { useMemo, useState } from "react";
import { addToCart, cartWarnings, priceCart, setQuantity } from "../cart";
import type { CartItem, PosClimber, Product, RecentCheckIn, RenewalDue, TaxRates } from "../types";
import CartPanel from "./CartPanel";
import CheckoutDialog from "./CheckoutDialog";
import ClimberPanel from "./ClimberPanel";
import ProductPanel from "./ProductPanel";

// The POS tab: pick a climber, add products to their cart, check out. The
// cart lives only in this page until Tender saves the sale; prices and totals
// are worked out again on the server.
export default function PointOfSale({
  climbers,
  checkedInToday,
  renewalsDue,
  products,
  taxRates,
}: {
  climbers: PosClimber[];
  checkedInToday: RecentCheckIn[];
  renewalsDue: RenewalDue[];
  products: Product[];
  taxRates: TaxRates;
}) {
  const [climberId, setClimberId] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);

  // From the latest server data, so a sale's new passes show straight away.
  const selected = climbers.find((c) => c.id === climberId) ?? null;
  const priced = useMemo(() => priceCart(cart, products, taxRates), [cart, products, taxRates]);
  const warnings = selected ? cartWarnings(selected, priced) : [];
  const byId = new Map(products.map((p) => [p.id, p]));

  // One climber per sale: switching climber starts a new cart.
  function selectClimber(id: string | null) {
    setClimberId(id);
    setCart([]);
  }

  function renew(renewal: RenewalDue) {
    selectClimber(renewal.climberId);
    const product = renewal.productId ? byId.get(renewal.productId) : undefined;
    if (product) setCart(addToCart([], product, products));
  }

  function changeQuantity(productId: string, quantity: number) {
    const product = byId.get(productId);
    if (product) setCart((c) => setQuantity(c, product, quantity));
  }

  return (
    <div className="grid items-start gap-3 lg:grid-cols-3">
      <ClimberPanel
        climbers={climbers}
        checkedInToday={checkedInToday}
        renewalsDue={renewalsDue}
        selected={selected}
        onSelect={selectClimber}
        onRenew={renew}
        onChange={() => selectClimber(null)}
      />
      <ProductPanel
        products={products}
        cart={cart}
        canAdd={selected !== null}
        onAdd={(product) => setCart((c) => addToCart(c, product, products))}
      />
      <CartPanel
        climberName={selected?.name ?? null}
        cart={priced}
        warnings={warnings}
        onQuantity={changeQuantity}
        onClear={() => setCart([])}
        onCheckout={() => setCheckingOut(true)}
      />
      {selected ? (
        <CheckoutDialog
          // A new climber gets a new checkout (and a new key for Tender).
          key={selected.id}
          open={checkingOut}
          climber={{ id: selected.id, name: selected.name }}
          items={cart}
          cart={priced}
          onClose={() => setCheckingOut(false)}
          onFinished={() => selectClimber(null)}
        />
      ) : null}
    </div>
  );
}
