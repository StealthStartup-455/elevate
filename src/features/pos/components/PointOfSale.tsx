"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Typography from "@mui/material/Typography";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { useBackdropClose } from "@/components/ui/useBackdropClose";
import { useDeskDialogOpen } from "@/features/check-ins/desk-dialogs";
import { getPosClimber } from "../actions";
import { addToCart, cartWarnings, priceCart, setQuantity } from "../cart";
import type { CartItem, PosClimber, Product, RecentCheckIn, RenewalDue, TaxRates } from "../types";
import CartPanel from "./CartPanel";
import CheckoutDialog from "./CheckoutDialog";
import ClimberPanel from "./ClimberPanel";
import ClimberSearch from "./ClimberSearch";
import ProductPanel from "./ProductPanel";

type Props = {
  /** Already picked, when opened from a climber's page (?climber=, #148). */
  initialClimber?: PosClimber | null;
  checkedInToday: RecentCheckIn[];
  renewalsDue: RenewalDue[];
  products: Product[];
  taxRates: TaxRates;
};

// Next.js keeps this page alive while staff are on another tab
// (cacheComponents), so POS opened again for the same climber, from Check-in
// or their page, showed whoever was picked there last, or nobody. Opening it
// for someone (a link or button to ?climber=) starts fresh with them; the
// browser's back and forward still restore the sale in progress.
export default function PointOfSale(props: Props) {
  const { bfcacheId } = useRouter();
  const key = props.initialClimber ? `${props.initialClimber.id}:${bfcacheId}` : "nobody";
  return <Pos key={key} {...props} />;
}

// The POS tab: pick a climber, add products to their cart, check out. The
// cart lives only in this page until Tender saves the sale; prices and totals
// are worked out again on the server.
function Pos({
  initialClimber = null,
  checkedInToday,
  renewalsDue,
  products,
  taxRates,
}: Props) {
  const [selected, setSelected] = useState<PosClimber | null>(initialClimber);
  // Picked from a list that only has their name, while their passes load.
  const [loading, setLoading] = useState<{ id: string; name: string } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  // The climber search dropdown is open: the sale area under it is blurred.
  const [searching, setSearching] = useState(false);
  // Another climber picked while the cart has items: waiting for a yes.
  const [switchTo, setSwitchTo] = useState<{ name: string; go: () => void } | null>(null);
  useDeskDialogOpen(switchTo !== null);
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

  // Switching climber starts a new cart, so ask first when there is one (#239).
  function confirmSwitch(id: string, name: string, go: () => void) {
    if (cart.length > 0 && selected && selected.id !== id) setSwitchTo({ name, go });
    else go();
  }
  const onCloseSwitch = useBackdropClose(switchTo !== null, () => setSwitchTo(null));

  function changeQuantity(productId: string, quantity: number) {
    const product = byId.get(productId);
    if (product) setCart((c) => setQuantity(c, product, quantity));
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Typography variant="pageTitle">Point of sale</Typography>
        <ClimberSearch
          checkedInToday={checkedInToday}
          renewalsDue={renewalsDue}
          onSelect={(climber) => confirmSwitch(climber.id, climber.name, () => selectClimber(climber))}
          onRenew={(renewal) => confirmSwitch(renewal.climberId, renewal.name, () => renew(renewal))}
          onOpenChange={setSearching}
        />
      </div>
      {/* Blurs just the sale area while the search is open; the nav and header stay sharp. */}
      <Box
        className="grid items-start gap-3 lg:grid-cols-3"
        sx={searching ? { filter: "blur(4px)", pointerEvents: "none", userSelect: "none" } : undefined}
      >
        <ClimberPanel
          selected={selected}
          loadingName={loading?.name ?? null}
          loadError={loadError}
          onUpdated={refreshSelected}
        />
        <ProductPanel
          products={products}
          cart={cart}
          canAdd={selected !== null}
          onAdd={(product) => setCart((c) => addToCart(c, product, products))}
          onQuantity={changeQuantity}
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
      </Box>
      <Dialog open={switchTo !== null} onClose={onCloseSwitch} fullWidth maxWidth="xs" aria-labelledby="switch-title">
        <DialogTitle id="switch-title">Switch climber?</DialogTitle>
        <DialogContent>
          <Typography variant="body">
            Switching to {switchTo?.name} empties {selected?.name}&apos;s cart. Each sale is for one climber.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSwitchTo(null)}>Keep cart</Button>
          <Button
            variant="contained"
            onClick={() => {
              switchTo?.go();
              setSwitchTo(null);
            }}
          >
            Switch climber
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
