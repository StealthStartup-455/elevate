import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import StatusPill from "@/components/ui/StatusPill";
import { formatMoney } from "@/features/pos/cart";
import type { MyPurchase } from "../queries";

const TENDER_LABEL = { CARD: "Card", CASH: "Cash", ONLINE: "Online" } as const;

// The climber's last purchases, newest first. A voided one stays on the list,
// marked, so a refund at the desk is never a mystery.
export default function PurchaseHistory({ purchases }: { purchases: MyPurchase[] }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <Typography variant="cardTitle">Your purchases</Typography>
        {purchases.length === 0 ? (
          <Typography variant="secondary">No purchases yet.</Typography>
        ) : (
          <ul className="flex flex-col gap-3" aria-label="Your purchases">
            {purchases.map((p) => (
              <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
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
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
