"use client";

import Button from "@mui/material/Button";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { Fragment, useState } from "react";
import StatusPill from "@/components/ui/StatusPill";
import { formatMoney } from "@/features/pos/cart";
import type { MyPurchase } from "../queries";

const TENDER_LABEL = { CARD: "Card", CASH: "Cash", ONLINE: "Online" } as const;

// The "Purchase history" button and its dialog, laid out like the desk's
// "Manual check in": an outlined button, and a frosted dialog over the page.
// Shows the climber's recent purchases, newest first. A voided one stays on
// the list, marked, so a refund at the desk is never a mystery.
export default function PurchaseHistory({ purchases }: { purchases: MyPurchase[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="outlined" onClick={() => setOpen(true)}>
        Purchase history
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        fullWidth
        maxWidth="sm"
        aria-labelledby="purchase-history-title"
        slotProps={{
          // Frosted glass, as in the desk's Manual check in: the page shows
          // through, with the same rounded corners and border as the cards.
          backdrop: {
            sx: {
              backgroundColor: "color-mix(in srgb, var(--mui-palette-text-primary) 25%, transparent)",
              backdropFilter: "blur(3px)",
            },
          },
          paper: {
            sx: {
              borderRadius: 3,
              border: 1,
              borderColor: "divider",
              backgroundImage: "none",
              backgroundColor: "color-mix(in srgb, var(--mui-palette-background-paper) 78%, transparent)",
              backdropFilter: "blur(16px) saturate(1.2)",
            },
          },
        }}
      >
        <DialogTitle id="purchase-history-title">Purchase history</DialogTitle>
        <DialogContent className="flex flex-col gap-3">
          {purchases.length === 0 ? (
            <Typography variant="secondary">No purchases yet.</Typography>
          ) : (
            <ul className="flex flex-col gap-3" aria-label="Your purchases">
              {purchases.map((p, i) => (
                <Fragment key={p.id}>
                  {i > 0 ? <Divider component="li" /> : null}
                  <li className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <div>
                      <Typography variant="body">{p.items}</Typography>
                      <Typography variant="secondary">
                        {p.date} · {TENDER_LABEL[p.tender]}
                      </Typography>
                    </div>
                    <div className="flex items-center gap-2">
                      {p.status === "VOIDED" ? <StatusPill status="bad" label="Refunded" /> : null}
                      <Typography variant="body">{formatMoney(p.totalCents)}</Typography>
                    </div>
                  </li>
                </Fragment>
              ))}
            </ul>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Done</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
