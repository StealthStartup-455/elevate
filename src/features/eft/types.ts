// The bank account a climber has on file for EFT (pre-authorized debit) of
// their monthly membership, as the app shows it. Never the full account number.
export type BankAccountSummary = {
  holderName: string;
  /** "RBC", or "Bank 123" for one not in banks.ts. */
  bank: string;
  institutionNumber: string;
  transitNumber: string;
  last4: string;
  /** "RBC ••••1234". */
  label: string;
  /** ISO calendar date it was added or last changed. */
  updatedOn: string;
};

// What the member types in the Add bank account form.
export type BankAccountInput = {
  holderName: string;
  transitNumber: string;
  institutionNumber: string;
  accountNumber: string;
  /** They agreed to the pre-authorized debit terms. */
  authorized: boolean;
};

export type BankAccountField = "holderName" | "transitNumber" | "institutionNumber" | "accountNumber" | "authorized";

export type BankAccountResult =
  | { ok: true; account: BankAccountSummary | null }
  | { ok: false; message: string; errors?: Partial<Record<BankAccountField, string>> };
