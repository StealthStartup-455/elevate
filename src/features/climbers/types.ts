export type WaiverStatus = "valid" | "expired" | "missing";

export type Climber = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  /** ISO calendar date, YYYY-MM-DD. */
  dateOfBirth: string;
  waiverStatus: WaiverStatus;
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
};
