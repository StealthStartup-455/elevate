import type { WaiverStatus } from "@/features/analytics/types";

export type { WaiverStatus };

// "none" is a climber who has never bought a membership (every new account).
export type MembershipStatus = "none" | "active" | "paused" | "expired";

export type Climber = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  /** ISO calendar date, YYYY-MM-DD. */
  dateOfBirth: string;
  waiverStatus: WaiverStatus;
  /** ISO date the current waiver runs out (or ran out). Unset when never signed. */
  waiverExpiresOn?: string;
  /** Mock only: pins the membership state. Otherwise it is derived from the id. */
  membershipStatus?: MembershipStatus;
};

// The fields a customer or staff member enters.
export type ClimberInput = Pick<
  Climber,
  "firstName" | "lastName" | "phone" | "dateOfBirth"
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
