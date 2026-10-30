import type { ProductKind, Tender } from "@/generated/prisma/enums";
import type { MembershipStatus, WaiverStatus } from "@/features/climbers/types";

export type { ProductKind, Tender };

// Something on the POS product tiles. Prices are before tax, in cents.
export type Product = {
  id: string;
  name: string;
  kind: ProductKind;
  priceCents: number;
  /** Punch cards only: visits on a new card. */
  punches: number | null;
  /** Memberships only. */
  durationMonths: number | null;
  /** Monthly recurring membership: the desk rings up each month. */
  recurring: boolean;
};

// What the cart holds: a product and how many. Prices are looked up again
// from the products, never kept in the cart.
export type CartItem = { productId: string; quantity: number };

export type PricedLine = {
  productId: string;
  name: string;
  kind: ProductKind;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
};

export type PricedCart = {
  lines: PricedLine[];
  subtotalCents: number;
  /** Hundredths of a percent: 500 is GST 5%. */
  taxRateBps: number;
  taxCents: number;
  totalCents: number;
};

// A climber as the POS shows them: enough to pick the right person and warn
// about their waiver and membership.
export type PosClimber = {
  id: string;
  name: string;
  phone: string;
  waiverStatus: WaiverStatus;
  waiverExpiresOn?: string;
  membershipStatus: MembershipStatus;
  membershipRenewsOn?: string;
  hasDayPass: boolean;
  punchesLeft: number;
};

// One of today's sales, for the list under the POS.
export type SaleSummary = {
  id: string;
  climberId: string;
  climberName: string;
  /** "4:12 p.m.", in the gym's time zone. */
  time: string;
  items: string;
  totalCents: number;
  tender: Tender;
  status: "PAID" | "VOIDED";
  voidReason?: string;
};

// Someone on the "Checked in today" list, newest first.
export type RecentCheckIn = {
  climberId: string;
  /** "4:12 p.m.", in the gym's time zone. */
  time: string;
};

// A monthly recurring member whose month is ending (or just ended). No card
// is stored, so the desk rings up the next month on the POS.
export type RenewalDue = {
  climberId: string;
  /** ISO calendar date the current month ends. */
  dueOn: string;
  overdue: boolean;
  /** The recurring product they bought last time, when it's still for sale. */
  productId: string | null;
};
