"use client";

import { useMemo, useRef, useState } from "react";
import { getPosClimber } from "../actions";
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
  checkedInToday,
  renewalsDue,
  products,
  taxRates,
}: {
  checkedInToday: RecentCheckIn[];
  renewalsDue: RenewalDue[];
  products: Product[];
  taxRates: TaxRates;
}) {
  const [selected, setSelected] = useState<PosClimber | null>(null);
  // Picked from a list that only has their name, while their passes load.
  const [loading, setLoading] = useState<{ id: string; name: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  // The climber the last load was for, so a slow answer for someone staff
  // already moved on from is dropped.
  const loadingId = useRef<string | null>(null);
  const priced = useMemo(() => priceCart(cart, products, taxRates), [cart, products, taxRates]);
  const warnings = selected ? cartWarnings(selected, priced) : [];
  const byId = new Map(products.map((p) => [p.id, p]));

  // Loads the climber fresh from the server, so new passes, a revoke or a
  // check-in show straight away. `shown` is what to show meanwhile.
  async function load(id: string, name: string, shown: PosClimber | null) {
    loadingId.current = id;
    setSelected(shown);
    setLoading(shown ? null : { id, name });
    setLoadError(null);
    let climber: PosClimber | null = null;
    try {
      climber = await getPosClimber(id);
    } catch {
      // Handled below like a climber that wasn't found.
    }
    if (loadingId.current !== id) return;
    setLoading(null);
    if (climber) setSelected(climber);
    else if (!shown) setLoadError(`Couldn't load ${name}. Search for them instead.`);
  }

  // One climber per sale: switching climber starts a new cart.
  function selectClimber(climber: PosClimber | { id: string; name: string } | null) {
    setCart([]);
    if (!climber) {
      loadingId.current = null;
      setSelected(null);
      setLoading(null);
      setLoadError(null);
      return;
    }
    void load(climber.id, climber.name, "waiverStatus" in climber ? climber : null);
  }

  function refreshSelected() {
    if (selected) void load(selected.id, selected.name, selected);
  }

  function renew(renewal: RenewalDue) {
    selectClimber({ id: renewal.climberId, name: renewal.name });
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
        checkedInToday={checkedInToday}
        renewalsDue={renewalsDue}
        selected={selected}
        loadingName={loading?.name ?? null}
        loadError={loadError}
        onSelect={selectClimber}
        onRenew={renew}
        onChange={() => selectClimber(null)}
        onUpdated={refreshSelected}
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
          onSaved={refreshSelected}
          onFinished={() => selectClimber(null)}
        />
      ) : null}
    </div>
  );
}
