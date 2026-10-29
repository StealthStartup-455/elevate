import type { WaiverStatus } from "@/features/analytics/types";

export type { WaiverStatus };

// "none" is a climber who has never bought a membership (every new account).
export type MembershipStatus = "none" | "active" | "paused" | "expired";

// A climber as the screens use it. Built from the Climber, Waiver and Pass
// tables in queries.ts.
export type Climber = {
  /** The database id (a UUID). Stable, so URLs built from it keep working. */
  id: string;
  firstName: string;
  lastName: string;
  /** Shown like 250-555-0101. */
  phone: string;
  /** Empty when none was given. */
  email: string;
  /** ISO calendar date, YYYY-MM-DD. */
  dateOfBirth: string;
  /** What they type to log in (demo login only). */
  username: string;
  waiverStatus: WaiverStatus;
  /** ISO date the current waiver runs out (or ran out). Unset when never signed. */
  waiverExpiresOn?: string;
  membershipStatus: MembershipStatus;
  /** ISO date the membership renews, or ended. Unset when there is none. */
  membershipRenewsOn?: string;
  /** A no-charge day pass covers today (stopgap, #62). */
  hasDayPass: boolean;
};

// The fields a customer or staff member enters.
export type ClimberInput = Pick<
  Climber,
  "firstName" | "lastName" | "phone" | "email" | "dateOfBirth"
>;

export type FieldErrors = Partial<Record<keyof ClimberInput, string>>;

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  errors?: FieldErrors;
  /** Echoed back after a validation error so the form keeps what was typed. */
  values?: ClimberInput;
  /** Set after a successful sign up, so the next step can act on the new climber. */
  climberId?: string;
};
